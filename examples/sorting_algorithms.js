import { run, bench, boxplot } from 'mitata';

function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}

function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[arr.length - 1];
  const left = [], right = [];
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] < pivot) left.push(arr[i]);
    else right.push(arr[i]);
  }
  return [...quickSort(left), pivot, ...quickSort(right)];
}

function generateRandomArray(size) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 1000));
}

boxplot(() => {
  bench('Bubble Sort', () => {
    const arr = generateRandomArray(1000);
    bubbleSort(arr);
  });

  bench('Quick Sort', () => {
    const arr = generateRandomArray(1000);
    quickSort(arr);
  });

  bench('Native Sort', () => {
    const arr = generateRandomArray(1000);
    arr.sort((a, b) => a - b);
  });
});

await run();