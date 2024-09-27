#include "../src/mitata.hpp"

int fibonacci(int n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
  mitata::runner runner;

  runner.bench("noop", []() { })->compact(true);

  runner.bench("fibonacci", []() {
    fibonacci(20);
  });

  runner.group([&]() {
    runner.bench("noop2", []() { })->compact(false);
    runner.bench("fibonacci2", []() { fibonacci(20); });
  });

  runner.summary([&]() {
    runner.bench("noop3", []() { })->compact(false);
    runner.bench("fibonacci3", []() { fibonacci(20); })->baseline(false);
    runner.bench("fibonacci4", []() { fibonacci(20); })->baseline(true);
  });

  runner.bench("noop4", []() { })->compact(true);

  auto stats = runner.run({ .colors = true, .format = "mitata", .filter = std::regex(".*") });
}