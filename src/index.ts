// typings only
import * as babel from "@babel/core";
import { NodePath } from "@babel/traverse";

// Jest globals
// https://jestjs.io/docs/en/api

// TODO: when `describe` variable exists or function is declared

export default function(context: typeof babel): babel.PluginObj {
  const t = context.types;
  return {
    visitor: {
      Program(programPath: NodePath<any>) {
        const globalPaths = programPath.get("body");
        if (Array.isArray(globalPaths)) {
          for (let path of globalPaths) {
            if (t.isExpressionStatement(path.node)) {
              const expression = path.node.expression;

              // foo();
              if (
                t.isCallExpression(expression) &&
                t.isIdentifier(expression.callee)
              ) {
                const globalVariableName = expression.callee.name;
                if (
                  [
                    "afterAll",
                    "afterEach",
                    "beforeAll",
                    "beforeEach",
                    "describe",
                    "test"
                  ].includes(globalVariableName)
                ) {
                  path.remove();
                  continue;
                }
              }

              // foo.bar();
              if (
                t.isCallExpression(expression) &&
                t.isMemberExpression(expression.callee)
              ) {
                const methodExpression = expression.callee;
                if (
                  t.isIdentifier(methodExpression.object) &&
                  t.isIdentifier(methodExpression.property)
                ) {
                  const nameTokens = [
                    methodExpression.object.name,
                    methodExpression.property.name
                  ];

                  if (
                    (nameTokens[0] === "describe" ||
                      nameTokens[0] === "test") &&
                    (nameTokens[1] === "only" || nameTokens[1] === "skip")
                  ) {
                    // describe.only(name, fn);
                    path.remove();
                    continue;
                  } else if (
                    nameTokens[0] === "test" &&
                    nameTokens[1] === "todo"
                  ) {
                    // test.todo(name);
                    path.remove();
                    continue;
                  }
                }
              }

              // foo.bar()();
              if (
                t.isCallExpression(expression) &&
                t.isCallExpression(expression.callee) &&
                t.isMemberExpression(expression.callee.callee)
              ) {
                const methodExpression = expression.callee.callee;
                if (
                  t.isIdentifier(methodExpression.object) &&
                  t.isIdentifier(methodExpression.property)
                ) {
                  const nameTokens = [
                    methodExpression.object.name,
                    methodExpression.property.name
                  ];

                  if (
                    (nameTokens[0] === "describe" ||
                      nameTokens[0] === "test") &&
                    nameTokens[1] === "each"
                  ) {
                    // describe.each(table)(name, fn, timeout);
                    path.remove();
                    continue;
                  }
                }
              }

              // foo.bar``();
              if (
                t.isCallExpression(expression) &&
                t.isTaggedTemplateExpression(expression.callee) &&
                t.isMemberExpression(expression.callee.tag)
              ) {
                const methodExpression = expression.callee.tag;
                if (
                  t.isIdentifier(methodExpression.object) &&
                  t.isIdentifier(methodExpression.property)
                ) {
                  const nameTokens = [
                    methodExpression.object.name,
                    methodExpression.property.name
                  ];

                  if (
                    (nameTokens[0] === "describe" ||
                      nameTokens[0] === "test") &&
                    nameTokens[1] === "each"
                  ) {
                    // describe.each`table`(name, fn, timeout);
                    path.remove();
                    continue;
                  }
                }
              }

              // foo.bar.buz()();
              if (
                t.isCallExpression(expression) &&
                t.isCallExpression(expression.callee) &&
                t.isMemberExpression(expression.callee.callee)
              ) {
                const methodExpression = expression.callee.callee;

                if (
                  t.isMemberExpression(methodExpression.object) &&
                  t.isIdentifier(methodExpression.object.object) &&
                  t.isIdentifier(methodExpression.object.property) &&
                  t.isIdentifier(methodExpression.property)
                ) {
                  const nameTokens = [
                    methodExpression.object.object.name,
                    methodExpression.object.property.name,
                    methodExpression.property.name
                  ];

                  if (
                    (nameTokens[0] === "describe" ||
                      nameTokens[0] === "test") &&
                    (nameTokens[1] === "only" || nameTokens[1] === "skip") &&
                    nameTokens[2] === "each"
                  ) {
                    // describe.only.each(table)(name, fn, timeout);
                    path.remove();
                    continue;
                  }
                }
              }

              // foo.bar.buz``();
              if (
                t.isCallExpression(expression) &&
                t.isTaggedTemplateExpression(expression.callee) &&
                t.isMemberExpression(expression.callee.tag)
              ) {
                const methodExpression = expression.callee.tag;

                if (
                  t.isMemberExpression(methodExpression.object) &&
                  t.isIdentifier(methodExpression.object.object) &&
                  t.isIdentifier(methodExpression.object.property) &&
                  t.isIdentifier(methodExpression.property)
                ) {
                  const nameTokens = [
                    methodExpression.object.object.name,
                    methodExpression.object.property.name,
                    methodExpression.property.name
                  ];

                  if (
                    (nameTokens[0] === "describe" ||
                      nameTokens[0] === "test") &&
                    (nameTokens[1] === "only" || nameTokens[1] === "skip") &&
                    nameTokens[2] === "each"
                  ) {
                    // describe.only.each`table`(name, fn, timeout);
                    path.remove();
                    continue;
                  }
                }
              }
            }
          }
        }
      }
    }
  };
}
