// Copyright (C) 2022 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
description: Negative zero, as an extended year, fails
esid: sec-temporal.plainyearmonth.compare
features: [Temporal]
---*/

const ok = new Temporal.PlainYearMonth(2000, 5);
const bad = "-000000-06";

assert.throws(
  RangeError,
  () => Temporal.PlainYearMonth.compare(bad, ok),
  "Cannot use minus zero as extended year (first argument)"
);

assert.throws(
  RangeError,
  () => Temporal.PlainYearMonth.compare(ok, bad),
  "Cannot use minus zero as extended year (second argument)"
);
