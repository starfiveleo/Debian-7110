
'use strict';

let externrefs = {};
let externsym = Symbol("externref");
function externref(s) {
  if (! (s in externrefs)) externrefs[s] = {[externsym]: s};
  return externrefs[s];
}
function is_externref(x) {
  return (x !== null && externsym in x) ? 1 : 0;
}
function is_funcref(x) {
  return typeof x === "function" ? 1 : 0;
}
function eq_externref(x, y) {
  return x === y ? 1 : 0;
}
function eq_funcref(x, y) {
  return x === y ? 1 : 0;
}

let spectest = {
  externref: externref,
  is_externref: is_externref,
  is_funcref: is_funcref,
  eq_externref: eq_externref,
  eq_funcref: eq_funcref,
  print: console.log.bind(console),
  print_i32: console.log.bind(console),
  print_i32_f32: console.log.bind(console),
  print_f64_f64: console.log.bind(console),
  print_f32: console.log.bind(console),
  print_f64: console.log.bind(console),
  global_i32: 666,
  global_i64: 666n,
  global_f32: 666,
  global_f64: 666,
  table: new WebAssembly.Table({initial: 10, maximum: 20, element: 'anyfunc'}),
  memory: new WebAssembly.Memory({initial: 1, maximum: 2})
};

let handler = {
  get(target, prop) {
    return (prop in target) ?  target[prop] : {};
  }
};
let registry = new Proxy({spectest}, handler);

function register(name, instance) {
  registry[name] = instance.exports;
}

function module(bytes, valid = true) {
  let buffer = new ArrayBuffer(bytes.length);
  let view = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; ++i) {
    view[i] = bytes.charCodeAt(i);
  }
  let validated;
  try {
    validated = WebAssembly.validate(buffer);
  } catch (e) {
    throw new Error("Wasm validate throws");
  }
  if (validated !== valid) {
    throw new Error("Wasm validate failure" + (valid ? "" : " expected"));
  }
  return new WebAssembly.Module(buffer);
}

function instance(bytes, imports = registry) {
  return new WebAssembly.Instance(module(bytes), imports);
}

function call(instance, name, args) {
  return instance.exports[name](...args);
}

function get(instance, name) {
  let v = instance.exports[name];
  return (v instanceof WebAssembly.Global) ? v.value : v;
}

function exports(instance) {
  return {module: instance.exports, spectest: spectest};
}

function run(action) {
  action();
}

function assert_malformed(bytes) {
  try { module(bytes, false) } catch (e) {
    if (e instanceof WebAssembly.CompileError) return;
  }
  throw new Error("Wasm decoding failure expected");
}

function assert_invalid(bytes) {
  try { module(bytes, false) } catch (e) {
    if (e instanceof WebAssembly.CompileError) return;
  }
  throw new Error("Wasm validation failure expected");
}

function assert_unlinkable(bytes) {
  let mod = module(bytes);
  try { new WebAssembly.Instance(mod, registry) } catch (e) {
    if (e instanceof WebAssembly.LinkError) return;
  }
  throw new Error("Wasm linking failure expected");
}

function assert_uninstantiable(bytes) {
  let mod = module(bytes);
  try { new WebAssembly.Instance(mod, registry) } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return;
  }
  throw new Error("Wasm trap expected");
}

function assert_trap(action) {
  try { action() } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return;
  }
  throw new Error("Wasm trap expected");
}

let StackOverflow;
try { (function f() { 1 + f() })() } catch (e) { StackOverflow = e.constructor }

function assert_exhaustion(action) {
  try { action() } catch (e) {
    if (e instanceof StackOverflow) return;
  }
  throw new Error("Wasm resource exhaustion expected");
}

function assert_return(action, ...expected) {
  let actual = action();
  if (actual === undefined) {
    actual = [];
  } else if (!Array.isArray(actual)) {
    actual = [actual];
  }
  if (actual.length !== expected.length) {
    throw new Error(expected.length + " value(s) expected, got " + actual.length);
  }
  for (let i = 0; i < actual.length; ++i) {
    switch (expected[i]) {
      case "nan:canonical":
      case "nan:arithmetic":
      case "nan:any":
        // Note that JS can't reliably distinguish different NaN values,
        // so there's no good way to test that it's a canonical NaN.
        if (!Number.isNaN(actual[i])) {
          throw new Error("Wasm return value NaN expected, got " + actual[i]);
        };
        return;
      case "ref.func":
        if (typeof actual[i] !== "function") {
          throw new Error("Wasm function return value expected, got " + actual[i]);
        };
        return;
      case "ref.extern":
        if (actual[i] === null) {
          throw new Error("Wasm reference return value expected, got " + actual[i]);
        };
        return;
      default:
        if (!Object.is(actual[i], expected[i])) {
          throw new Error("Wasm return value " + expected[i] + " expected, got " + actual[i]);
        };
    }
  }
}

// unreached-valid.wast:1
let $1 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x91\x80\x80\x80\x00\x04\x60\x01\x7f\x01\x7f\x60\x00\x00\x60\x00\x01\x7f\x60\x00\x01\x7e\x03\x88\x80\x80\x80\x00\x07\x00\x00\x01\x02\x03\x01\x01\x07\x97\x81\x80\x80\x00\x07\x10\x73\x65\x6c\x65\x63\x74\x2d\x74\x72\x61\x70\x2d\x6c\x65\x66\x74\x00\x00\x11\x73\x65\x6c\x65\x63\x74\x2d\x74\x72\x61\x70\x2d\x72\x69\x67\x68\x74\x00\x01\x10\x73\x65\x6c\x65\x63\x74\x2d\x75\x6e\x72\x65\x61\x63\x68\x65\x64\x00\x02\x19\x73\x65\x6c\x65\x63\x74\x5f\x75\x6e\x72\x65\x61\x63\x68\x65\x64\x5f\x72\x65\x73\x75\x6c\x74\x5f\x31\x00\x03\x19\x73\x65\x6c\x65\x63\x74\x5f\x75\x6e\x72\x65\x61\x63\x68\x65\x64\x5f\x72\x65\x73\x75\x6c\x74\x5f\x32\x00\x04\x0f\x75\x6e\x72\x65\x61\x63\x68\x61\x62\x6c\x65\x2d\x6e\x75\x6d\x00\x05\x0f\x75\x6e\x72\x65\x61\x63\x68\x61\x62\x6c\x65\x2d\x72\x65\x66\x00\x06\x0a\xee\x80\x80\x80\x00\x07\x88\x80\x80\x80\x00\x00\x00\x41\x00\x20\x00\x1b\x0b\x88\x80\x80\x80\x00\x00\x41\x00\x00\x20\x00\x1b\x0b\xa0\x80\x80\x80\x00\x00\x00\x1b\x00\x41\x00\x1b\x00\x41\x00\x41\x00\x1b\x00\x41\x00\x41\x00\x41\x00\x1b\x00\x43\x00\x00\x00\x00\x41\x00\x1b\x00\x0b\x85\x80\x80\x80\x00\x00\x00\x1b\x6a\x0b\x89\x80\x80\x80\x00\x00\x00\x42\x00\x41\x00\x1b\x7c\x0b\x86\x80\x80\x80\x00\x00\x00\x1b\x45\x1a\x0b\x86\x80\x80\x80\x00\x00\x00\x1b\xd1\x1a\x0b");

// unreached-valid.wast:42
assert_trap(() => call($1, "select-trap-left", [1]));

// unreached-valid.wast:43
assert_trap(() => call($1, "select-trap-left", [0]));

// unreached-valid.wast:44
assert_trap(() => call($1, "select-trap-right", [1]));

// unreached-valid.wast:45
assert_trap(() => call($1, "select-trap-right", [0]));

// unreached-valid.wast:49
let $2 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x07\x8f\x80\x80\x80\x00\x01\x0b\x6d\x65\x65\x74\x2d\x62\x6f\x74\x74\x6f\x6d\x00\x00\x0a\xa1\x80\x80\x80\x00\x01\x9b\x80\x80\x80\x00\x00\x02\x7c\x02\x7d\x00\x41\x01\x0e\x02\x00\x01\x01\x0b\x1a\x44\x00\x00\x00\x00\x00\x00\x00\x00\x0b\x1a\x0b");
