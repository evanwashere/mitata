import { run, bench, summary, do_not_optimize } from 'mitata';

// https://v8.dev/blog/elements-kinds

summary(() => {
  bench('sum(holey $size)', function* (state) {
    const size = state.get('size');
  
    const arr = new Array(size);
    for (let o = 0; o < size; o++) arr[o] = 1;
  
    yield {
      [0]() {
        return arr;
      },
  
      bench(arr) {
        let i = 0;
        const len = arr.length;
        for (let o = 0; o < len; o++) i += arr[o];
  
        return do_not_optimize(i);
      },
    };
  }).range('size', 1, 1024);
  
  bench('sum(packed $size)', function* (state) {
    const size = state.get('size');
    const arr = Array.from({ length: size }, () => 1);
  
    yield {
      [0]() {
        return arr;
      },
  
      bench(arr) {
        let i = 0;
        const len = arr.length;
        for (let o = 0; o < len; o++) i += arr[o];
  
        return do_not_optimize(i);
      },
    };
  }).range('size', 1, 1024);
});

summary(() => {
  bench('new Array + sum(holey $size)', function* (state) {
    const size = state.get('size');
  
    yield {
      [0]() {
        return size;
      },
  
      bench(size) {
        const arr = new Array(size);
        for (let o = 0; o < size; o++) arr[o] = 1;

        let i = 0;
        const len = arr.length;
        for (let o = 0; o < len; o++) i += arr[o];
  
        return do_not_optimize(i);
      },
    };
  }).range('size', 1, 1024);
  
  bench('Array.from + sum(packed $size)', function* (state) {
    const size = state.get('size');
  
    yield {
      [0]() {
        return size;
      },
  
      bench(size) {
        const arr = Array.from({ length: size }, () => 1);

        let i = 0;
        const len = arr.length;
        for (let o = 0; o < len; o++) i += arr[o];
  
        return do_not_optimize(i);
      },
    };
  }).range('size', 1, 1024);

  bench('arr.push() + sum(packed $size)', function* (state) {
    const size = state.get('size');
  
    yield {
      [0]() {
        return size;
      },
  
      bench(size) {
        const arr = [];
        for (let o = 0; o < size; o++) arr.push(1);

        let i = 0;
        const len = arr.length;
        for (let o = 0; o < len; o++) i += arr[o];
  
        return do_not_optimize(i);
      },
    };
  }).range('size', 1, 1024);
});

await run();