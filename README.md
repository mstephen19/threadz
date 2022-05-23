# Threadz

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

> It is recommended to use this function

Use this feature cautiously. Setting it too high could lead to issues.

## `_threadz`

There are three properties on the `_threadz` API, which is returned by the `declare` function.

```TypeScript
// Get the current number of currently active workers
WORKERS._threadz.activeWorkers();

// A reference to your original declarations
WORKERS._threadz.declarations;

// The maximum number of workers that can be run simultaneously
WORKERS._threadz.maxWorkers;
```

## Future prospects

In the future, this package will provide an API for easily sending messages back and forth between the main thread and the worker thread.
