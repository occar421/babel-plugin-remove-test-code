# babel-plugin-remove-test-code

Babel plugin that remove test codes from the file

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
- [ ] remove comments by this.getSibling(current - 1 or + 1)
- [ ] binging API instead of manual variable declaration search
- [ ] cares declared variable by nested destructuring
- [ ] (Jest) the Jest Object & mockFn
- [ ] Examples
- [ ] cares global objects (`global`, `window`, `self`, `this`, etc...)

## License

MIT
