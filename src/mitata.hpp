#ifndef MITATA
#define MITATA

#include <map>
#include <regex>
#include <string>
#include <vector>
#include <sstream>
#include <numeric>
#include <iostream>
#include <algorithm>

namespace mitata {
  typedef float f32; typedef double f64;
  typedef int8_t i8; typedef uint8_t u8;
  typedef int16_t i16; typedef uint16_t u16;
  typedef int32_t i32; typedef uint32_t u32;
  typedef int64_t i64; typedef uint64_t u64;
  typedef __int128 i128; typedef unsigned __int128 u128;

  namespace lib {
    struct k_stats {
      u64 ticks;
      f64 min, max, avg;
      std::vector<f64> samples;
      f64 p25, p50, p75, p99, p999;
    };

    static const auto k_min_samples = 12;
    static const auto k_batch_unroll = 1;
    static const auto k_max_samples = 1e9;
    static const auto k_warmup_samples = 2;
    static const auto k_batch_samples = 628;
    static const auto k_samples_threshold = 12;
    static const auto k_batch_threshold = 65536;
    static const auto k_min_cpu_time = 1000 * 1e6;
    static const auto k_warmup_threshold = 500000;
    static const auto epoch = std::chrono::high_resolution_clock::now();

    struct k_options {
      u64 min_samples = k_min_samples;
      u64 max_samples = k_max_samples;
      u64 batch_unroll = k_batch_unroll;
      f64 min_cpu_time = k_min_cpu_time;
      u64 batch_samples = k_batch_samples;
      u64 warmup_samples = k_warmup_samples;
      f64 batch_threshold = k_batch_threshold;
      f64 warmup_threshold = k_warmup_threshold;
      u64 samples_threshold = k_samples_threshold;
    };

    inline const f64 now() {
      return std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::high_resolution_clock::now() - epoch).count();
    }

    inline const k_stats fn(void (*fn)(), const k_options opts = k_options()) {
      k_stats stats;
      bool batch = false;

      warmup: {
        const auto t0 = now();
        fn(); const auto t1 = now();

        if ((t1 - t0) <= opts.warmup_threshold) {
          for (auto o = 0; o < opts.warmup_samples; o++) {
            const auto t0 = now();
            fn(); const auto t1 = now();
            if ((batch = (t1 - t0) <= opts.batch_threshold)) break;
          }
        }
      }

      if (!batch) {
        f64 t = 0.0;

        for (auto _ = 0; _ < opts.max_samples; _++) {
          if (_ >= opts.min_samples && t >= opts.min_cpu_time) break;

          const auto t0 = now();
          fn(); const auto t1 = now();

          const auto diff = t1 - t0;

          t += diff;
          stats.samples.push_back(diff);
        }
      }

      else {
        f64 t = 0.0;

        for (auto _ = 0; _ < opts.max_samples; _++) {
          if (_ >= opts.min_samples && t >= opts.min_cpu_time) break;

          const auto t0 = now();

          for (auto o = 0; o < (opts.batch_samples / opts.batch_unroll); o++) {
            for (auto u = 0; u < opts.batch_unroll; u++) fn();
          }

          const auto t1 = now();
          const auto diff = t1 - t0;

          t += diff;
          stats.samples.push_back(diff / opts.batch_samples);
        }
      }

      std::sort(stats.samples.begin(), stats.samples.end());
      if (stats.samples.size() > opts.samples_threshold) stats.samples = std::vector<f64>(stats.samples.begin() + 2, stats.samples.end() - 2);

      stats.max = stats.samples.back();
      stats.min = stats.samples.front();
      stats.p25 = stats.samples[.25 * (stats.samples.size() - 1)];
      stats.p50 = stats.samples[.50 * (stats.samples.size() - 1)];
      stats.p75 = stats.samples[.75 * (stats.samples.size() - 1)];
      stats.p99 = stats.samples[.99 * (stats.samples.size() - 1)];
      stats.p999 = stats.samples[.999 * (stats.samples.size() - 1)];
      stats.ticks = stats.samples.size() * (!batch ? 1 : opts.batch_samples);
      stats.avg = std::accumulate(stats.samples.begin(), stats.samples.end(), 0.0) / stats.samples.size();

      return stats;
    }
  }

  namespace ctx {
    inline const std::string compiler() {
      #if defined(__APPLE__)
        return "clang (Apple)";

      #elif defined(_MSC_VER)
        return "msvc";

      #elif defined(__INTEL_COMPILER)
        return "intel c++";
      
      #elif defined(__clang__)
        return "clang (LLVM)";

      #elif defined(__GNUC__) || defined(__GNUG__)
        return "gcc";

      #else
        return "null";
      #endif
    }
  }

  namespace fmt {
    struct k_bins {
      u64 avg;
      u64 peak;
      u64 outliers;
      f64 min, max, step;
      std::vector<u64> bins;
      std::vector<f64> steps;
    };

    namespace colors {
      static const auto bold = "\x1b[1m";
      static const auto reset = "\x1b[0m";

      static const auto red = "\x1b[31m";
      static const auto cyan = "\x1b[36m";
      static const auto blue = "\x1b[34m";
      static const auto gray = "\x1b[90m";
      static const auto white = "\x1b[37m";
      static const auto black = "\x1b[30m";
      static const auto green = "\x1b[32m";
      static const auto yellow = "\x1b[33m";
      static const auto magenta = "\x1b[35m";
    }

    inline const std::string str(std::string s, u64 len = 3) {
      if (len >= s.length()) return s;
      return s.substr(0, len - 2) + "..";
    }

    inline const std::string pad_e(std::string s, u64 len, char c = ' ') {
      if (s.find("µ") != std::string::npos) len += 1;

      if (len <= s.length()) return s;
      return s.append(len - s.length(), c);
    }

    inline const std::string pad_s(std::string s, u64 len, char c = ' ') {
      if (s.find("µ") != std::string::npos) len += 1;

      if (len <= s.length()) return s;
      return s.insert(0, len - s.length(), c);
    }

    inline const std::string time(f64 ns) {
      std::ostringstream buf;
      buf.precision(2); buf << std::fixed;
      if (ns < 1e0) { buf << ns * 1e3 << " ps"; return buf.str(); }
      if (ns < 1e3) { buf << ns << " ns"; return buf.str(); } ns /= 1000;
      if (ns < 1e3) { buf << ns << " µs"; return buf.str(); } ns /= 1000;
      if (ns < 1e3) { buf << ns << " ms"; return buf.str(); } ns /= 1000;

      if (ns < 1e3) { buf << ns << " s"; return buf.str(); } ns /= 60;
      if (ns < 1e3) { buf << ns << " m"; return buf.str(); } buf << (ns / 60) << " h"; return buf.str();
    }

    inline const k_bins bins(lib::k_stats stats, u64 size = 6, f64 percentile = 1) {
      u64 poffset = percentile * (stats.samples.size() - 1);
      auto clamp = [](auto m, auto v, auto x) { return v < m ? m : v > x ? x : v; };

      f64 min = stats.min;
      f64 max = .0 != stats.samples[poffset] ? stats.samples[poffset] : (.0 == stats.max ? 1.0 : stats.max);

      f64 step = (max - min) / (size - 1);
      auto bins = std::vector<u64>(size, 0);
      auto steps = std::vector<f64>(size, 0);

      for (auto o = 0; o < size; o++) steps[o] = min + o * step;
      for (auto o = 0; o <= poffset; o++) bins[std::round((stats.samples[o] - min) / step)]++;

      return {
        .min = min, .max = max,
        .step = step, .bins = bins, .steps = steps,
        .outliers = stats.samples.size() - 1 - poffset,
        .peak = *std::max_element(bins.begin(), bins.end()),
        .avg = clamp(0, (u64)std::round((stats.avg - min) / step), size - 1),
      };
    }

    inline const std::string barplot(std::map<std::string, f64> map, u64 legend = 8, u64 width = 14, bool colors = true) {
      std::string barplot = "";
      f64 min = std::min_element(map.begin(), map.end(), [](const auto &a, const auto &b) { return a.second < b.second; })->second;
      f64 max = std::max_element(map.begin(), map.end(), [](const auto &a, const auto &b) { return a.second < b.second; })->second;

      auto steps = width - 11;
      f64 step = (max - min) / steps;

      barplot += std::string(1 + legend, ' ');
      barplot += "┌" + std::string(width, ' ') + "┐" + "\n";

      for (const auto &[name, value] : map) {
        u64 offset = 1 + std::round((value - min) / step);
        barplot += fmt::pad_s(fmt::str(name, legend), legend) + " ┤";

        if (colors) barplot += fmt::colors::gray;
        for (auto o = 0; o < offset; o++) barplot += "■"; if (colors) barplot += fmt::colors::reset;

        barplot += " "; if (colors) barplot += fmt::colors::yellow;
        barplot += fmt::time(value); if (colors) barplot += fmt::colors::reset; barplot += " \n";
      }

      barplot += std::string(1 + legend, ' ');
      barplot += "└" + std::string(width, ' ') + "┘" + "\n";

      return barplot;
    }

    inline const std::vector<std::string> histogram(k_bins bins, u64 height = 2, bool colors = true) {
      auto histogram = std::vector<std::string>(height);
      auto clamp = [](auto m, auto v, auto x) { return v < m ? m : v > x ? x : v; };
      auto symbols = std::vector<std::string>{"▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"};
      auto canvas = std::vector<std::vector<std::string>>(height, std::vector<std::string>(bins.bins.size(), " "));

      u64 avg = bins.avg;
      u64 peak = bins.peak;
      f64 scale = (f64)(height * symbols.size() - 1) / peak;

      for (auto o = 0; o < bins.bins.size(); o++) {
        auto b = bins.bins[o];
        auto s = std::round(b * scale);

        for (auto h = 0; h < height; h++) {
          auto leftover = s - symbols.size();
          canvas[h][o] = symbols[clamp(0, s, symbols.size() - 1)]; if (0 >= (s = leftover)) break;
        }
      }

      for (auto h = 0; h < height; h++) {
        std::string l = "";

        if (0 != avg) {
          if (colors) l += fmt::colors::cyan;
          for (auto o = 0; o < avg; o++) l += canvas[h][o]; if (colors) l += fmt::colors::reset;
        }

        if (colors) l += fmt::colors::yellow;
        l += canvas[h][avg]; if (colors) l += fmt::colors::reset;

        if (avg != (bins.bins.size() - 1)) {
          if (colors) l += fmt::colors::magenta;
          for (auto o = 1 + avg; o < bins.bins.size(); o++) l += canvas[h][o]; if (colors) l += fmt::colors::reset;
        }

        histogram[h] = l;
      }

      return (std::reverse(histogram.begin(), histogram.end()), histogram);
    }

    inline const std::string boxplot(std::map<std::string, lib::k_stats> map, u64 legend = 8, u64 width = 14, bool colors = true) {
      std::string boxplot = "";
      f64 tmin = std::min_element(map.begin(), map.end(), [](const auto &a, const auto &b) { return a.second.min < b.second.min; })->second.min;
      auto tmax_stats = std::max_element(map.begin(), map.end(), [](const auto &a, const auto &b) { return (.0 != a.second.p99 ? a.second.p99 : (.0 == a.second.max ? 1.0 : a.second.max)) < (.0 != b.second.p99 ? b.second.p99 : (.0 == b.second.max ? 1.0 : b.second.max)); })->second;

      f64 tmax = .0 != tmax_stats.p99 ? tmax_stats.p99 : (.0 == tmax_stats.max ? 1.0 : tmax_stats.max);

      auto steps = 2 + width;
      auto step = (tmax - tmin) / (steps - 1);

      boxplot += std::string(1 + legend, ' ');
      boxplot += "┌" + std::string(width, ' ') + "┐" + "\n";

      for (const auto &[name, stats] : map) {
        f64 min = stats.min;
        f64 avg = stats.avg;
        f64 p25 = stats.p25;
        f64 p75 = stats.p75;
        f64 max = .0 != stats.p99 ? stats.p99 : (.0 == stats.max ? 1.0 : stats.max);

        u64 min_offset = std::round((min - tmin) / step);
        u64 max_offset = std::round((max - tmin) / step);
        u64 avg_offset = std::round((avg - tmin) / step);
        u64 p25_offset = std::round((p25 - tmin) / step);
        u64 p75_offset = std::round((p75 - tmin) / step);

        auto u = std::vector<std::string>(1 + max_offset, " ");
        auto m = std::vector<std::string>(1 + max_offset, " ");
        auto l = std::vector<std::string>(1 + max_offset, " ");

        if (min_offset < p25_offset) {
          u[min_offset] = (!colors ? "╷" : (std::string(fmt::colors::cyan) + "╷" + fmt::colors::reset));
          m[min_offset] = (!colors ? "├" : (std::string(fmt::colors::cyan) + "├" + fmt::colors::reset));
          l[min_offset] = (!colors ? "╵" : (std::string(fmt::colors::cyan) + "╵" + fmt::colors::reset));
          for (auto o = 1 + min_offset; o < p25_offset; o++) m[o] = (!colors ? "─" : (std::string(fmt::colors::cyan) + "─" + fmt::colors::reset));
        }

        if (p25_offset < avg_offset) {
          u[p25_offset] = (!colors ? "┌" : (std::string(fmt::colors::cyan) + "┌" + fmt::colors::reset));
          l[p25_offset] = (!colors ? "└" : (std::string(fmt::colors::cyan) + "└" + fmt::colors::reset));

          auto ms = min_offset == p25_offset ? "│" : "┤";
          m[p25_offset] = (!colors ? ms : (std::string(fmt::colors::cyan) + ms + fmt::colors::reset));
          for (auto o = 1 + p25_offset; o < avg_offset; o++) u[o] = l[o] = (!colors ? "─" : (std::string(fmt::colors::cyan) + "─" + fmt::colors::reset));
        }

        u[avg_offset] = (!colors ? "┬" : (std::string(fmt::colors::yellow) + "┬" + fmt::colors::reset));
        m[avg_offset] = (!colors ? "│" : (std::string(fmt::colors::yellow) + "│" + fmt::colors::reset));
        l[avg_offset] = (!colors ? "┴" : (std::string(fmt::colors::yellow) + "┴" + fmt::colors::reset));

        if (p75_offset > avg_offset) {
          u[p75_offset] = (!colors ? "┐" : (std::string(fmt::colors::magenta) + "┐" + fmt::colors::reset));
          l[p75_offset] = (!colors ? "┘" : (std::string(fmt::colors::magenta) + "┘" + fmt::colors::reset));

          auto ms = max_offset == p75_offset ? "│" : "├";
          m[p75_offset] = (!colors ? ms : (std::string(fmt::colors::magenta) + ms + fmt::colors::reset));
          for (auto o = 1 + avg_offset; o < p75_offset; o++) u[o] = l[o] = (!colors ? "─" : (std::string(fmt::colors::magenta) + "─" + fmt::colors::reset));
        }

        if (max_offset > p75_offset) {
          u[max_offset] = (!colors ? "╷" : (std::string(fmt::colors::magenta) + "╷" + fmt::colors::reset));
          m[max_offset] = (!colors ? "┤" : (std::string(fmt::colors::magenta) + "┤" + fmt::colors::reset));
          l[max_offset] = (!colors ? "╵" : (std::string(fmt::colors::magenta) + "╵" + fmt::colors::reset));
          for (auto o = 1 + std::max(avg_offset, p75_offset); o < max_offset; o++) m[o] = (!colors ? "─" : (std::string(fmt::colors::magenta) + "─" + fmt::colors::reset));
        }

        boxplot += std::string(1 + legend, ' ');
        for (auto s : u) boxplot += s; boxplot += "\n";
        boxplot += fmt::pad_s(fmt::str(name, legend), legend);
        boxplot += " "; for (auto s : m) boxplot += s; boxplot += "\n";
        boxplot += std::string(1 + legend, ' '); for (auto s : l) boxplot += s; boxplot += "\n";
      }

      boxplot += std::string(1 + legend, ' ');
      boxplot += "└" + std::string(width, ' ') + "┘" + "\n";

      auto min = fmt::time(tmin);
      auto max = fmt::time(tmax);
      auto mid = fmt::time((tmin + tmax) / 2);

      auto u_fix = 0
        + (min.find("µ") != std::string::npos ? 1 : 0)
        + (mid.find("µ") != std::string::npos ? 1 : 0)
        + (max.find("µ") != std::string::npos ? 1 : 0);

      f64 gap = (f64)(width + u_fix - min.length() - mid.length() - max.length()) / 2;

      boxplot += std::string(1 + legend, ' ');

      if (colors) boxplot += fmt::colors::cyan;
      boxplot += min; if (colors) boxplot += fmt::colors::reset;

      boxplot += std::string(std::floor(gap), ' ') + ' ';

      if (colors) boxplot += fmt::colors::gray;
      boxplot += mid; if (colors) boxplot += fmt::colors::reset;

      boxplot += ' ' + std::string(std::ceil(gap), ' ');

      if (colors) boxplot += fmt::colors::magenta;
      boxplot += max; if (colors) boxplot += fmt::colors::reset;

      return boxplot + "\n";
    }
  }

  class B {
    std::string name;

    public:
      void (*fn)();
      bool _compact = false;
      bool _baseline = false;
      B(std::string name, void (*fn)()) : name(name), fn(fn) {}
      void compact(bool compact = true) { this->_compact = compact; }
      void baseline(bool baseline = true) { this->_baseline = baseline; }
  };

  struct k_run {
    bool colors = true;
    std::string format = "mitata";
    std::regex filter = std::regex(".*");
  };

  struct k_collection {
    std::vector<char> types;
    std::map<std::string, B> benchmarks;
  };

  class runner {
    std::vector<k_collection> collections;

    public:
      runner() { collections.push_back({}); }

      B* bench(const std::string name, void (*fn)()) {
        return &collections.back().benchmarks.emplace(name, B(name, fn)).first->second;
      }

      void group(std::function<void()> fn) {
        auto last = &collections.back();
        if (!last->types.empty()) last->types.push_back('g'); else collections.push_back({ .types = {'g'} });

        fn(); collections.push_back({});
      }

      void boxplot(std::function<void()> fn) {
        auto last = &collections.back();
        if (!last->types.empty()) last->types.push_back('x'); else collections.push_back({ .types = {'x'} });

        fn(); collections.push_back({});
      }

      void barplot(std::function<void()> fn) {
        auto last = &collections.back();
        if (!last->types.empty()) last->types.push_back('b'); else collections.push_back({ .types = {'b'} });

        fn(); collections.push_back({});
      }

      void summary(std::function<void()> fn) {
        auto last = &collections.back();
        if (!last->types.empty()) last->types.push_back('s'); else collections.push_back({ .types = {'s'} });

        fn(); collections.push_back({});
      }

      std::map<std::string, lib::k_stats> run(const k_run opts = k_run()) {
        std::map<std::string, lib::k_stats> stats;
        lib::k_stats noop = lib::fn(B("noop", []() { }).fn);

        if ("quiet" == opts.format) {
          for (const auto &collection : collections) {
            for (const auto &[name, bench] : collection.benchmarks) {
              if (!std::regex_match(name, opts.filter)) continue; stats[name] = lib::fn(bench.fn);
            }
          }
        }

        if ("json" == opts.format) {
          std::cout << "{" << std::endl;
          std::cout << "\"context\": {" << std::endl;
          std::cout << "\"runtime\": \"c++\"," << std::endl;
          std::cout << "\"compiler\": \"" << ctx::compiler() << "\"," << std::endl;

          std::cout << "\"noop\": {" << std::endl;
          std::cout << "\"min\": " << noop.min << "," << std::endl;
          std::cout << "\"max\": " << noop.max << "," << std::endl;
          std::cout << "\"avg\": " << noop.avg << "," << std::endl;
          std::cout << "\"p25\": " << noop.p25 << "," << std::endl;
          std::cout << "\"p50\": " << noop.p50 << "," << std::endl;
          std::cout << "\"p75\": " << noop.p75 << "," << std::endl;
          std::cout << "\"p99\": " << noop.p99 << "," << std::endl;
          std::cout << "\"p999\": " << noop.p999 << "," << std::endl;
          std::cout << "\"ticks\": " << noop.ticks << "," << std::endl;

          std::cout << "\"samples\": [" << std::endl;

          std::cout << noop.samples[0];
          for (auto o = 1; o < noop.samples.size(); o++) std::cout << "," << noop.samples[o];
          std::cout << "]" << std::endl << "}" << std::endl; std::cout << "}" << "," << std::endl;

          std::cout << "\"benchmarks\": [" << std::endl;
          auto size = std::accumulate(collections.begin(), collections.end(), 0, [](auto a, auto b) { return a + b.benchmarks.size(); });

          auto o = 0;

          for (const auto &collection : collections) {
            for (const auto &[name, bench] : collection.benchmarks) {
              if (!std::regex_match(name, opts.filter)) continue;

              auto s = stats[name] = lib::fn(bench.fn);

              std::cout << "{" << std::endl;
              std::cout << "\"name\": \"" << name << "\"," << std::endl;

              std::cout << "\"min\": " << s.min << "," << std::endl;
              std::cout << "\"max\": " << s.max << "," << std::endl;
              std::cout << "\"avg\": " << s.avg << "," << std::endl;
              std::cout << "\"p25\": " << s.p25 << "," << std::endl;
              std::cout << "\"p50\": " << s.p50 << "," << std::endl;
              std::cout << "\"p75\": " << s.p75 << "," << std::endl;
              std::cout << "\"p99\": " << s.p99 << "," << std::endl;
              std::cout << "\"p999\": " << s.p999 << "," << std::endl;
              std::cout << "\"ticks\": " << s.ticks << "," << std::endl;

              std::cout << "\"samples\": [" << std::endl;

              std::cout << s.samples[0];
              for (auto o = 1; o < s.samples.size(); o++) std::cout << "," << s.samples[o];

              std::cout << "]" << std::endl;
              std::cout << "}" << std::endl;
              if (++o != size) std::cout << "," << std::endl;
            }
          }

          std::cout << "]" << std::endl;
          std::cout << "}" << std::endl;
        }

        if ("mitata" == opts.format) {
          const auto k_legend = 28;
          if (opts.colors) std::cout << fmt::colors::gray;

          std::cout << "runtime: c++" << std::endl;
          std::cout << "compiler: " << ctx::compiler() << std::endl;

          if (opts.colors) std::cout << fmt::colors::reset;

          std::cout << std::endl;
          std::cout << fmt::pad_e("benchmark", k_legend);
          std::cout << "avg (min … max) p75   p99    (min … top 1%)" << std::endl;

          bool first = true;
          bool optimized_out_warning = false;
          for (auto o = 0; o < (15 + k_legend); o++) std::cout << "-";
          std::cout << " "; for (auto o = 0; o < 31; o++) std::cout << "-"; std::cout << std::endl;

          for (const auto &collection : collections) {
            if (collection.benchmarks.empty()) continue;
            std::vector<std::pair<std::string, std::pair<bool, lib::k_stats>>> trials;

            bool has_matches = std::any_of(collection.benchmarks.begin(), collection.benchmarks.end(), [&](const auto &bench) {
              return std::regex_match(bench.first, opts.filter);
            });

            if (!has_matches) continue;
            else if (first) first = false;

            else {
              std::cout << std::endl;
              if (opts.colors) std::cout << fmt::colors::gray;
              for (auto o = 0; o < (15 + k_legend); o++) std::cout << "-"; std::cout << " ";
              for (auto o = 0; o < 31; o++) std::cout << "-"; std::cout << (!opts.colors ? "" : fmt::colors::reset) << std::endl;
            }

            for (const auto &[name, bench] : collection.benchmarks) {
              if (!std::regex_match(name, opts.filter)) continue;

              auto s = stats[name] = lib::fn(bench.fn);
              trials.push_back(std::make_pair(name, std::make_pair(bench._baseline, s)));

              auto compact = bench._compact;
              bool optimized_out = s.avg < (1.21 * noop.avg);
              optimized_out_warning = optimized_out_warning || optimized_out;

              if (compact) {
                auto avg = fmt::pad_s(fmt::time(s.avg), 9);
                auto fname = fmt::pad_e(fmt::str(name, k_legend), k_legend);

                std::cout << fname << " ";
                if (!opts.colors) std::cout << avg << "/iter";
                else std::cout << fmt::colors::bold << fmt::colors::yellow << avg << fmt::colors::reset << fmt::colors::bold << "/iter" << fmt::colors::reset;

                std::cout << " ";
                auto p75 = fmt::pad_s(fmt::time(s.p75), 9);
                auto p99 = fmt::pad_s(fmt::time(s.p99), 9);
                auto histogram = fmt::histogram(fmt::bins(s, 11, .99), 1, opts.colors);

                if (!opts.colors) std::cout << p75 << " " << p99 << " " << histogram[0];
                else std::cout << fmt::colors::gray << p75 << " " << p99 << fmt::colors::reset << " " << histogram[0];
                if (optimized_out) std::cout << " " << (!opts.colors ? "" : fmt::colors::red) << "!" << (!opts.colors ? "" : fmt::colors::reset);
              }

              else {
                auto avg = fmt::pad_s(fmt::time(s.avg), 9);
                auto fname = fmt::pad_e(fmt::str(name, k_legend), k_legend);

                std::cout << fname << " ";
                auto p75 = fmt::pad_s(fmt::time(s.p75), 9);
                auto histogram = fmt::histogram(fmt::bins(s, 21, .99), 2, opts.colors);

                if (!opts.colors) std::cout << avg << "/iter" << " " << p75 << " " << histogram[0];
                else std::cout << fmt::colors::bold << fmt::colors::yellow << avg << fmt::colors::reset << fmt::colors::bold << "/iter" << fmt::colors::reset << " " << fmt::colors::gray << p75 << fmt::colors::reset << " " << histogram[0];

                if (optimized_out) {
                  if (!opts.colors) std::cout << " " << "!";
                  else std::cout << " " << fmt::colors::red << "!" << fmt::colors::reset;
                }

                std::cout << std::endl;
                auto min = fmt::time(s.min);
                auto max = fmt::time(s.max);
                auto p99 = fmt::pad_s(fmt::time(s.p99), 9);
                auto diff = (2 * 9) - (min.length() + max.length());
                diff += (min.find("µ") != std::string::npos ? 1 : 0);
                diff += (max.find("µ") != std::string::npos ? 1 : 0);

                std::cout << fmt::pad_e(" ", diff + k_legend - 8);
                if (!opts.colors) std::cout << "("; else std::cout << fmt::colors::gray << "(" << fmt::colors::reset;

                if (!opts.colors) std::cout << min << " … " << max << ")";
                else std::cout << fmt::colors::cyan << min << fmt::colors::reset << fmt::colors::gray << " … " << fmt::colors::reset << fmt::colors::magenta << max << fmt::colors::reset << fmt::colors::gray << ")" << fmt::colors::reset;

                std::cout << " ";
                if (!opts.colors) std::cout << p99 << " " << histogram[1];
                else std::cout << fmt::colors::gray << p99 << fmt::colors::reset << " " << histogram[1];
              }

              std::cout << std::endl;
            }

            if (collection.types.end() != std::find(collection.types.begin(), collection.types.end(), 'b')) {
              if (1 >= trials.size()) continue;

              std::cout << std::endl;
              auto map = std::map<std::string, f64>();

              for (const auto &trial : trials) {
                map[trial.first] = trial.second.second.avg;
              }

              std::cout << fmt::barplot(map, k_legend, 44, opts.colors);
            }

            if (collection.types.end() != std::find(collection.types.begin(), collection.types.end(), 'x')) {
              std::cout << std::endl;
              auto map = std::map<std::string, lib::k_stats>();

              for (const auto &trial : trials) {
                map[trial.first] = trial.second.second;
              }

              std::cout << fmt::boxplot(map, k_legend, 44, opts.colors);
            }

            if (collection.types.end() != std::find(collection.types.begin(), collection.types.end(), 's')) {
              if (1 >= trials.size()) continue;

              std::sort(trials.begin(), trials.end(), [](const auto &a, const auto &b) {
                return a.second.second.avg < b.second.second.avg;
              });

              auto baseline = std::find_if(trials.begin(), trials.end(), [](const auto &trial) {
                return trial.second.first;
              });

              std::cout << std::endl;
              if (baseline == trials.end()) baseline = trials.begin();
              if (!opts.colors) std::cout << "summary" << std::endl;
              else std::cout << fmt::colors::bold << "summary" << fmt::colors::reset << std::endl;

              if (!opts.colors) std::cout << "  " << baseline->first << std::endl;
              else std::cout << "  " << fmt::colors::bold << fmt::colors::cyan << baseline->first << fmt::colors::reset << std::endl;

              for (const auto trial : trials) {
                if (trial.first == baseline->first) continue;

                auto c = trial.second.second;
                auto b = baseline->second.second;

                auto faster = b.avg <= c.avg;

                auto diff = !faster
                  ? std::round(1 / c.avg * b.avg * 100) / 100
                  : std::round(1 / b.avg * c.avg * 100) / 100;

                std::cout << "   ";
                if (opts.colors) std::cout << (!faster ? fmt::colors::red : fmt::colors::green);

                std::cout << diff;
                if (opts.colors) std::cout << fmt::colors::reset;
                std::cout << "x" << " " << (faster ? "faster" : "slower") << " than ";

                if (opts.colors) std::cout << fmt::colors::bold << fmt::colors::cyan;
                std::cout << trial.first; if (opts.colors) std::cout << fmt::colors::reset;

                std::cout << std::endl;
              }
            }
          }

          if (optimized_out_warning) {
            if (!opts.colors) std::cout << std::endl << "! = benchmark was likely optimized out (dead code elimination)" << std::endl;
            else std::cout << std::endl << fmt::colors::red << "!" << fmt::colors::reset << " " << fmt::colors::gray << "=" << fmt::colors::reset << " benchmark was likely optimized out " << fmt::colors::gray << "(dead code elimination)" << fmt::colors::reset << std::endl;
          }
        }

        return stats;
      }
  };
}

#endif