// typings only
import * as babel from "@babel/core";
import { NodePath } from "@babel/traverse";

// Jest globals
// https://jestjs.io/docs/en/api

// TODO: throws error if `describe` is overwritten or `it` is overwritten and used? `throw path.buildCodeFrameError("aaa?");` + path <= of "identifier"
// TODO: ease restriction like removing `describe.foo` along with `describe.only`
// TODO: cares declared variable by nested destructuring
// TODO: The Jest Object
// TODO: magic comment
// TODO: Test Framework Options ([Jest, Mocha, MagicComment])

// TODO remove this
declare global {
  interface Array<T> {
    difference(array: T[]): T[];
  }
}
Array.prototype.difference = function(array) {
  return this.filter(el => !array.includes(el));
};

function collectDeclaredNamesShallow(
  t: typeof babel.types,
  paths: NodePath<any>[]
): string[] {
  const declaredNames = [];
  for (let path of paths) {
    if (t.isFunctionDeclaration(path.node)) {
      if (path.node.id !== null) {
        // function foo() { ??? }
        declaredNames.push(path.node.id.name);
      }
      continue;
    }
    if (t.isVariableDeclaration(path.node)) {
      for (let decl of path.node.declarations) {
        if (t.isIdentifier(decl.id)) {
          // const foo = ???;
          declaredNames.push(decl.id.name);
        } else if (t.isObjectPattern(decl.id)) {
          for (let prop of decl.id.properties) {
            if (t.isProperty(prop) && t.isIdentifier(prop.value)) {
              // const { foo } = ???;
              // const { foo: bar } = ???;
              declaredNames.push(prop.value.name);
            } else if (
              t.isProperty(prop) &&
              t.isAssignmentPattern(prop.value) &&
              t.isIdentifier(prop.value.left)
            ) {
              // const { foo = 1 } = ???;
              // const { foo: bar = 1 } = ???;
              declaredNames.push(prop.value.left.name);
            } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
              // const { ...foo } = ???;
              declaredNames.push(prop.argument.name);
            }
          }
        } else if (t.isArrayPattern(decl.id)) {
          for (let elem of decl.id.elements) {
            if (t.isIdentifier(elem)) {
              // const [foo] = ???;
              declaredNames.push(elem.name);
            } else if (
              t.isAssignmentPattern(elem) &&
              t.isIdentifier(elem.left)
            ) {
              // const [foo = 1] = ???;
              declaredNames.push(elem.left.name);
            } else if (t.isRestElement(elem) && t.isIdentifier(elem.argument)) {
              // const [...foo] = ???;
              declaredNames.push(elem.argument.name);
            }
          }
        }
      }
      continue;
    }
    if (
      t.isExpressionStatement(path.node) &&
      t.isAssignmentExpression(path.node.expression)
    ) {
      const assignExpression = path.node.expression;
      if (t.isIdentifier(assignExpression.left)) {
        // foo = ???;
        declaredNames.push(assignExpression.left.name);
      } else if (t.isObjectPattern(assignExpression.left)) {
        for (let prop of assignExpression.left.properties) {
          if (t.isProperty(prop) && t.isIdentifier(prop.value)) {
            // ({ foo } = ???);
            // ({ foo: bar } = ???);
            declaredNames.push(prop.value.name);
          } else if (
            t.isProperty(prop) &&
            t.isAssignmentPattern(prop.value) &&
            t.isIdentifier(prop.value.left)
          ) {
            // ({ foo = 1 } = ???);
            // ({ foo: bar = 1 } = ???);
            declaredNames.push(prop.value.left.name);
          } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
            // ({ ...foo } = ???);
            declaredNames.push(prop.argument.name);
          }
        }
      } else if (t.isArrayPattern(assignExpression.left)) {
        for (let elem of assignExpression.left.elements) {
          if (t.isIdentifier(elem)) {
            // [foo] = ???;
            declaredNames.push(elem.name);
          } else if (t.isAssignmentPattern(elem) && t.isIdentifier(elem.left)) {
            // [foo = 1] = ???;
            declaredNames.push(elem.left.name);
          } else if (t.isRestElement(elem) && t.isIdentifier(elem.argument)) {
            // [...foo] = ???;
            declaredNames.push(elem.argument.name);
          }
        }
      } else if (t.isMemberExpression(assignExpression.left)) {
        const member = assignExpression.left;

        if (t.isIdentifier(member.object) && t.isIdentifier(member.property)) {
          // foo.bar = ???;
          declaredNames.push(`${member.object.name}.${member.property.name}`);
        } else if (
          t.isMemberExpression(member.object) &&
          t.isIdentifier(member.object.object) &&
          t.isIdentifier(member.object.property) &&
          t.isIdentifier(member.property)
        ) {
          // foo.bar.buz = ???;
          declaredNames.push(
            `${member.object.object.name}.${member.object.property.name}.${
              member.property.name
            }`
          );
        }
      }
      continue;
    }
  }

  return declaredNames;
}

export default function(context: typeof babel): babel.PluginObj {
  const t = context.types;
  return {
    visitor: {
      Program(programPath: NodePath<any>) {
        let globalPaths = programPath.get("body");
        if (!Array.isArray(globalPaths)) {
          globalPaths = [globalPaths];
        }

        // finding user's declaration
        const globalVariableNames: string[] = collectDeclaredNamesShallow(
          t,
          globalPaths
        );

        // finding test code
        for (let path of globalPaths) {
          if (t.isExpressionStatement(path.node)) {
            const expression = path.node.expression;

            // foo();
            if (
              t.isCallExpression(expression) &&
              t.isIdentifier(expression.callee)
            ) {
              const variableNameToCall = expression.callee.name;
              if (
                [
                  "afterAll",
                  "afterEach",
                  "beforeAll",
                  "beforeEach",
                  "describe",
                  "test",
                  "it"
                ]
                  .difference(globalVariableNames)
                  .includes(variableNameToCall)
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
                const variableNameTokensToCall = [
                  methodExpression.object.name,
                  methodExpression.property.name
                ];

                if (
                  ["describe", "test", "it"]
                    .difference(globalVariableNames)
                    .includes(variableNameTokensToCall[0]) &&
                  (variableNameTokensToCall[1] === "only" ||
                    variableNameTokensToCall[1] === "skip") &&
                  !globalVariableNames.includes(
                    `${variableNameTokensToCall[0]}.${
                      variableNameTokensToCall[1]
                    }`
                  )
                ) {
                  // describe.only(name, fn);
                  path.remove();
                  continue;
                } else if (
                  ["test", "it"]
                    .difference(globalVariableNames)
                    .includes(variableNameTokensToCall[0]) &&
                  variableNameTokensToCall[1] === "todo" &&
                  !globalVariableNames.includes(
                    `${variableNameTokensToCall[0]}.${
                      variableNameTokensToCall[1]
                    }`
                  )
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
                const variableNameTokensToCall = [
                  methodExpression.object.name,
                  methodExpression.property.name
                ];

                if (
                  ["describe", "test", "it"]
                    .difference(globalVariableNames)
                    .includes(variableNameTokensToCall[0]) &&
                  variableNameTokensToCall[1] === "each" &&
                  !globalVariableNames.includes(
                    `${variableNameTokensToCall[0]}.${
                      variableNameTokensToCall[1]
                    }`
                  )
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
                const variableNameTokensToCall = [
                  methodExpression.object.name,
                  methodExpression.property.name
                ];

                if (
                  ["describe", "test", "it"]
                    .difference(globalVariableNames)
                    .includes(variableNameTokensToCall[0]) &&
                  variableNameTokensToCall[1] === "each" &&
                  !globalVariableNames.includes(
                    `${variableNameTokensToCall[0]}.${
                      variableNameTokensToCall[1]
                    }`
                  )
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
                const variableNameTokensToCall = [
                  methodExpression.object.object.name,
                  methodExpression.object.property.name,
                  methodExpression.property.name
                ];

                if (
                  ["describe", "test", "it"]
                    .difference(globalVariableNames)
                    .includes(variableNameTokensToCall[0]) &&
                  (variableNameTokensToCall[1] === "only" ||
                    variableNameTokensToCall[1] === "skip") &&
                  !globalVariableNames.includes(
                    `${variableNameTokensToCall[0]}.${
                      variableNameTokensToCall[1]
                    }`
                  ) &&
                  variableNameTokensToCall[2] === "each" &&
                  !globalVariableNames.includes(
                    `${variableNameTokensToCall[0]}.${
                      variableNameTokensToCall[1]
                    }.${variableNameTokensToCall[2]}`
                  )
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
                const variableNameTokensToCall = [
                  methodExpression.object.object.name,
                  methodExpression.object.property.name,
                  methodExpression.property.name
                ];

                if (
                  ["describe", "test", "it"]
                    .difference(globalVariableNames)
                    .includes(variableNameTokensToCall[0]) &&
                  (variableNameTokensToCall[1] === "only" ||
                    variableNameTokensToCall[1] === "skip") &&
                  !globalVariableNames.includes(
                    `${variableNameTokensToCall[0]}.${
                      variableNameTokensToCall[1]
                    }`
                  ) &&
                  variableNameTokensToCall[2] === "each" &&
                  !globalVariableNames.includes(
                    `${variableNameTokensToCall[0]}.${
                      variableNameTokensToCall[1]
                    }.${variableNameTokensToCall[2]}`
                  )
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
  };
}
