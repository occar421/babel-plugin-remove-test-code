# babel-plugin-remove-test-code

Babel plugin that remove test codes from the file.

See an example at "examples" how the code looks like. ("examples/react-app/src/components/counter.jsx")

(Currently, Jest runs the same tests because they are listed directly and indirectly with `import` statement.)

## Usage

You can write a unit-test in the same file. This Babel plugin removes all test code not to bundle it into the production build.

```ecmascript 6
// main.js
const message = "!";

while (1) {
  alert(message);
}

test("message", () => {
  expect(message).toBe("!");
});
```

will be below in after be processed by this plugin

```ecmascript 6
// main.js
const message = "!";

while (1) {
  alert(message);
}
```

Currently, this supports MagicComment (default) and Jest.

## Configuration

When you use Jest as a test framework,

```json
{
  "plugins": [["babel-plugin-remove-test-code", { "targets": ["Jest"] }]]
}
```

## TODO

- [x] magic comments to remove or not to remove
- [ ] cares declared variable by nested destructuring
- [ ] (Jest) the Jest Object & mockFn
- [ ] Examples
- [ ] cares global objects (`global`, `window`, `self`, `this`, etc...)

## Notes

- binging API instead of manual variable declaration search  
  (not possible for assignment of global can't be detected)
- skip children if out of range  
  (not possible due to `enter` `exit`)

## License

MIT
