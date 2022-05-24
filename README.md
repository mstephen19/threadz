# Threadz

![ts](https://flat.badgen.net/badge/Built%20With/TypeScript/blue)

Threadz is a multithreading library mainly for offloading expensive operations onto separate threads in order to boost performance. The goal here is to make multi-threading accessible; therefore, there is very little overhead when it comes to using this package. Here's what the overall workflow looks like:

1. Declare your "worker" functions using the `declare` function.
2. Add optional configurations for the `Worker` instance.
3. Use the worker-ified functions in your code.

Each worker is passed through a `WorkerPool` implementation, which prevents more than 2 worker threads from running per core at one time and queues up workers when the limit of currently active workers is reached.

## `declare` your workers

In your main project, create a new file and call it whatever you'd like, then import the `declare` function like so:

```TypeScript
import { declare } from 'threadz';
```

In order for them to work with Threadz, the operations you'd like to run on separate threads must be defined within this function. The results should be the default export of the declarations file.

```TypeScript
// threadz.ts
import { declare } from 'threadz';

// This MUST be the default export
export default declare({
    // "add" is the name by which we'd like to
    // refer to the function when calling it
    add: {
        worker: (num1: number, num2: number) => num1 + num2,
    },
});
```

Notice that you never had to pass any types to the `declare` function - they are inferred. A declaration object type can still be provided optionally though.

## Using workers

In the file you'd like to use the function, import your declarations then simply use dot notation to call the function as normal. The only important thing to note is that all worker-ified functions returned by `ThreadzAPI` return promises.

```TypeScript
// index.ts
import WORKERS from './threadz';

(async () => {
    const data = await WORKERS.add(2, 3);
    console.log(data);
})();
```

If your IDE supports TypeScript its intellisense will provide autofill suggestions for the methods on this `WORKERS` object, and will yell at you if you pass any incorrect parameters.

Here's what's happening under the hood:

1. A worker is queued to be created
2. The queued worker is added to the worker pool
3. Once there is an open slot for the worker, it is created and run
4. The promise resolves/rejects once the worker has completed

Of course, the output of the above code is `5`. Now that you're familiar with the package though, let's look at some more interesting stuff.

## Unblock blocking code

Here's a massive loop that takes 16 seconds to run:

```TypeScript
// massiveLoop.ts
export const massiveLoop = () => {
    console.time('loop')
    for (const x of Array(999999999).keys()) {
    }
    console.timeEnd('loop')
    return 'done';
};
```

```TypeScript
// index.ts
import { massiveLoop } from './someLoop';

massiveLoop();
console.log('hi');
```

When we run this code, here's what we see:

```text
loop: 16.404s
hi
```

Of course, the loop completely blocked the log from running. We also know that there's no way to promisify a loop, so our precious thread is screwed until this 16 second loop completes. That's no good. Let's add it to our declarations:

```TypeScript
// threadz.ts
import { declare } from 'threadz';
import { massiveLoop } from './massiveLoop';

export default declare({
    massiveLoop: {
        worker: massiveLoop,
    },
});
```

```TypeScript
// index.ts
import WORKERS from './threadz';

(async () => {
    WORKERS.massiveLoop();
    console.log('hi');
})();
```

When we run this one, here's what's in console:

```text
hi
loop: 13.961s
```

A crap ton of these loops can also be run simultaneously:

```TypeScript
// index.ts
import WORKERS from './threadz';

(async () => {
    await Promise.all(Array(10).fill(null).map(() => WORKERS.massiveLoop()));
})();
```

## Options

When declaring a worker, you can pass in additional options through the optional `options` key. You can learn about all the supported options in the Node.js [documentation](https://nodejs.org/api/worker_threads.html#new-workerfilename-options).

## Set a max threads limit

You can easily set a max worker count on the worker pool by using the `setMaxWorkers` function.

```TypeScript
// threadz.ts
import { declare, setMaxWorkers } from 'threadz';
import { massiveLoop } from './massiveLoop';

setMaxWorkers(2)

export default declare({
    massiveLoop: {
        worker: massiveLoop,
    },
});
```

> It is recommended to use this function above your declarations export.

Use this feature cautiously. Setting it too high could lead to issues.

## `_threadz`

There are three properties on the `_threadz` API, which is returned by the `declare` function.

```TypeScript
// Get the current number of currently active workers
WORKERS._threadz.activeWorkers();

// The maximum number of workers that can be run simultaneously
WORKERS._threadz.maxWorkers();

// A reference to your original declarations
WORKERS._threadz.declarations;
```

## Shared memory

With the `SharedMemory` API, you can easily share memory between multiple worker threads and the main thread. Simply import the class and instantiate a new one with some initial state:

```TypeScript
import { SharedMemory } from 'threadz';

const memory = new SharedMemory<Record<string, unknown>>({ initialState: { foo: 'bar' } });
```

This shared memory has an predetermined and unchangeable size. You can also provide a `sizeMb` argument to define how large you'd like this to be (default is 1MB, which is generous).

The data within the memory can be viewed or changed by using `memory.state`:

```TypeScript
const memory = new SharedMemory<Record<string, unknown>>({ initialState: { foo: 'bar' } });

console.log(memory.state); // -> {"foo":"bar"}

memory.state = { abc: 'def' };

console.log(memory.state); // -> {"abc":"def"}
```

> The return value of `memory.state` will always be a string. Additionally, when setting a new state, ensure that it is larger than what it previously was in order to avoid parsing issues.

You can also create a shared memory straight from a `Uint8Array` like so:

```TypeScript
const shared = new SharedArrayBuffer(1e6);

const array = new Uint8Array(shared);

const memory = SharedMemory.from(array);
```

This is useful when manually passing shared memory into a worker function.

## Passing shared memory into a worker function

First, we'll define a worker function which simply expects a `Uint8Array` as an argument:

```TypeScript
// workers.ts
import { declare, SharedMemory } from 'threadz';

export default declare({
    foo: {
        worker: async (shared: Uint8Array) => {
            // Turn the Uint8Array into a SharedMemory object
            console.log(SharedMemory.from(shared).state);
        },
    },
});
```

Then, we'll just create a `SharedMemory` and pass its `Uint8Array` into our call of the worker:

```TypeScript
import { SharedMemory } from 'threadz';
import WORKERS from './workers';

(async () => {
    const memory = new SharedMemory({ initialState: 'foo' });
    await WORKERS.foo(memory.shared);
})();
```

Here's what we see logged:

```text
"foo"
```

## `Interact`ing with a worker thread

The main API returned by declare is great; however, it does not allow for communication between the main thread and the worker thread beyond parameter passing. For use-cases where further configuration and communication are required, you can use the `Interact` API.

```TypeScript
import { Interact } from 'threadz';
import WORKERS from './workers';

(async () => {
    // You must ALWAYS call the `go()` method at the end
    const worker = Interact.with(WORKERS.foo).go();

    worker.on('success', () => console.log('hello world'));
    worker.on('error', () => console.log('oops'));
})();
```

Unlike the main API, this returns a `ThreadzWorker` on which events can be listened for rather than a promise. The two available events are `success` and `error`.

You can also pass the memory into here like so:

```TypeScript
const memory = new SharedMemory({ initialState: { hey: 'guys!' } });

const worker = Interact.with(WORKERS.foo).memory(memory).go();
```

### Sending messages

Finally, you are able to listen for events by using the `Interact.prototype.onParentMessage` function and send messages with `worker.sendMessage()`:

```TypeScript
import { Interact, SharedMemory } from 'threadz';
import WORKERS from './workers';

(async () => {
    const memory = new SharedMemory({ initialState: 'test' });

    const worker = Interact.with(WORKERS.foo)
        .memory(memory)
        .onParentMessage<string>((memory, data) => (memory.state = data as string))
        .go();

    worker.sendMessage('hello world');

    worker.on('success', () => {
        console.log(memory.state);
    });
})();
```

`onParentMessage()`'s first parameter is the `SharedMemory` API, and the second is whatever data that was sent from the parent to the worker.

> Important note: The types of operations you can do in the `onParentMessage` function are very limited. Attempting to use imported modules/external variables will result in nasty errors.
