// typings only
import * as babel from "@babel/core";
import { NodePath } from "@babel/traverse";
import {
  Expression,
  ObjectProperty,
  PatternLike,
  RestElement,
  VariableDeclarator
  // @ts-ignore
} from "@babel/types";

// Jest globals
// https://jestjs.io/docs/en/api

// TODO: cares declared variable by nested destructuring
// TODO: The Jest Object
// TODO: magic comment
// TODO: `global`, `window`, `self`, `this`, etc...

function collectDeclaredVariablesShallow(
  t: typeof babel.types,
  paths: NodePath[]
): Map<string, NodePath> {
  const declaredNames = new Map();
  for (let path of paths) {
    if (t.isFunctionDeclaration(path.node)) {
      if (path.node.id !== null) {
        // function foo() { ??? }
        declaredNames.set(path.node.id.name, path.get("id"));
      }
      continue;
    }
    if (t.isVariableDeclaration(path.node)) {
      path.node.declarations.forEach(
        (decl: VariableDeclarator, declIndex: number) => {
          if (t.isIdentifier(decl.id)) {
            // const foo = ???;
            declaredNames.set(
              decl.id.name,
              path.get(`declarations.${declIndex}`)
            );
          } else if (t.isObjectPattern(decl.id)) {
            decl.id.properties.forEach(
              (prop: RestElement | ObjectProperty, propIndex: number) => {
                if (t.isProperty(prop) && t.isIdentifier(prop.value)) {
                  // const { foo } = ???;
                  // const { foo: bar } = ???;
                  declaredNames.set(
                    prop.value.name,
                    path.get(
                      `declarations.${declIndex}.id.properties.${propIndex}`
                    )
                  );
                } else if (
                  t.isProperty(prop) &&
                  t.isAssignmentPattern(prop.value) &&
                  t.isIdentifier(prop.value.left)
                ) {
                  // const { foo = 1 } = ???;
                  // const { foo: bar = 1 } = ???;
                  declaredNames.set(
                    prop.value.left.name,
                    path.get(
                      `declarations.${declIndex}.id.properties.${propIndex}.value.left`
                    )
                  );
                } else if (
                  t.isRestElement(prop) &&
                  t.isIdentifier(prop.argument)
                ) {
                  // const { ...foo } = ???;
                  declaredNames.set(
                    prop.argument.name,
                    path.get(
                      `declarations.${declIndex}.id.properties.${propIndex}.argument`
                    )
                  );
                }
              }
            );
          } else if (t.isArrayPattern(decl.id)) {
            decl.id.elements.forEach((elem: PatternLike, elemIndex: number) => {
              if (t.isIdentifier(elem)) {
                // const [foo] = ???;
                declaredNames.set(
                  elem.name,
                  path.get(`declarations.${declIndex}.id.elements.${elemIndex}`)
                );
              } else if (
                t.isAssignmentPattern(elem) &&
                t.isIdentifier(elem.left)
              ) {
                // const [foo = 1] = ???;
                declaredNames.set(
                  elem.left.name,
                  path.get(
                    `declarations.${declIndex}.id.elements.${elemIndex}.left`
                  )
                );
              } else if (
                t.isRestElement(elem) &&
                t.isIdentifier(elem.argument)
              ) {
                // const [...foo] = ???;
                declaredNames.set(
                  elem.argument.name,
                  path.get(
                    `declarations.${declIndex}.id.elements.${elemIndex}.argument`
                  )
                );
              }
            });
          }
        }
      );
    }
    if (
      t.isExpressionStatement(path.node) &&
      t.isAssignmentExpression(path.node.expression)
    ) {
      const assignExpression = path.node.expression;
      if (t.isIdentifier(assignExpression.left)) {
        // foo = ???;
        declaredNames.set(
          assignExpression.left.name,
          path.get(`expression.left`)
        );
      } else if (t.isObjectPattern(assignExpression.left)) {
        assignExpression.left.properties.forEach(
          (prop: RestElement | ObjectProperty, propIndex: number) => {
            if (t.isProperty(prop) && t.isIdentifier(prop.value)) {
              // ({ foo } = ???);
              // ({ foo: bar } = ???);
              declaredNames.set(
                prop.value.name,
                path.get(`expression.left.properties.${propIndex}.value`)
              );
            } else if (
              t.isProperty(prop) &&
              t.isAssignmentPattern(prop.value) &&
              t.isIdentifier(prop.value.left)
            ) {
              // ({ foo = 1 } = ???);
              // ({ foo: bar = 1 } = ???);
              declaredNames.set(
                prop.value.left.name,
                path.get(`expression.left.properties.${propIndex}.value.left`)
              );
            } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
              // ({ ...foo } = ???);
              declaredNames.set(
                prop.argument.name,
                path.get(`expression.left.properties.${propIndex}.argument`)
              );
            }
          }
        );
      } else if (t.isArrayPattern(assignExpression.left)) {
        assignExpression.left.elements.forEach(
          (elem: PatternLike, elemIndex: number) => {
            if (t.isIdentifier(elem)) {
              // [foo] = ???;
              declaredNames.set(
                elem.name,
                path.get(`expression.left.elements.${elemIndex}`)
              );
            } else if (
              t.isAssignmentPattern(elem) &&
              t.isIdentifier(elem.left)
            ) {
              // [foo = 1] = ???;
              declaredNames.set(
                elem.left.name,
                path.get(`expression.left.elements.${elemIndex}.left`)
              );
            } else if (t.isRestElement(elem) && t.isIdentifier(elem.argument)) {
              // [...foo] = ???;
              declaredNames.set(
                elem.argument.name,
                path.get(`expression.left.elements.${elemIndex}.argument`)
              );
            }
          }
        );
      } else if (t.isMemberExpression(assignExpression.left)) {
        let member: Expression = assignExpression.left;

        while (true) {
          if (!("object" in member)) {
            throw path.buildCodeFrameError(
              "Not supported. Please report this to fix it."
            );
          } else if (t.isIdentifier(member.object)) {
            // x
            break;
          } else if (t.isMemberExpression(member.object)) {
            // x.foo
            member = member.object;
          } else if (t.isCallExpression(member.object)) {
            // x()
            member = member.object.callee;
          } else if (t.isAssignmentPattern(member.object)) {
            // (foo = x)
            // TODO: (x = foo) pattern
            member = member.object.right;
          } else {
            throw path.buildCodeFrameError(
              "Not supported. Please report this to fix it."
            );
          }
        }

        declaredNames.set(
          member.object.name,
          path.get(`expression.left.object`)
        );
      }
      continue;
    }
  }

  return declaredNames;
}

const supportedTargets = ["Jest"] as ["Jest"]; // as const

type U<T extends unknown[]> = T[number]; // tuple -> union

function isValidOptions(
  options: object
): options is {
  targets?: U<typeof supportedTargets>[];
} {
  // @ts-ignore
  if (options.targets) {
    // @ts-ignore
    const targets = options.targets as unknown;
    if (!Array.isArray(targets) || targets.some(t => typeof t !== "string")) {
      throw new Error(`"targets" option should be an array of string.`);
    }

    for (const t of targets) {
      if (!supportedTargets.includes(t)) {
        throw new Error(`target option "${t}" is not supported.`);
      }
    }

    return true;
  } else {
    // TODO default option
    return false;
  }
}

export default function(
  { types: t }: typeof babel,
  options: object
): babel.PluginObj {
  if (!isValidOptions(options)) {
    throw new Error(`Something invalid options.`);
  }

  return {
    visitor: {
      Program(programPath: NodePath) {
        let globalPaths = programPath.get("body");
        if (!Array.isArray(globalPaths)) {
          globalPaths = [globalPaths];
        }

        // finding user's declaration
        const globalVariables = collectDeclaredVariablesShallow(t, globalPaths);

        // finding test code
        for (let path of globalPaths) {
          if (t.isExpressionStatement(path.node)) {
            const expression = path.node.expression;

            // foo();
            if (
              t.isCallExpression(expression) &&
              t.isIdentifier(expression.callee)
            ) {
              const variableName = expression.callee.name;
              if (
                [
                  "afterAll",
                  "afterEach",
                  "beforeAll",
                  "beforeEach",
                  "describe",
                  "test",
                  "it"
                ].includes(variableName)
              ) {
                const variablePath = globalVariables.get(variableName);
                if (variablePath) {
                  throw variablePath.buildCodeFrameError(
                    `Try using "${variableName}" but "${variableName}" is re-declared illegally.`
                  );
                }

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
                const objectName = methodExpression.object.name;
                const propertyName = methodExpression.property.name;

                if (
                  (["describe", "test", "it"].includes(objectName) &&
                    (propertyName === "only" || propertyName === "skip")) ||
                  (["test", "it"].includes(objectName) &&
                    propertyName === "todo")
                ) {
                  // describe.only(name, fn);
                  const variablePath = globalVariables.get(objectName);
                  if (variablePath) {
                    throw variablePath.buildCodeFrameError(
                      `Try using "${objectName}.${propertyName}" but "${objectName}" is re-declared illegally.`
                    );
                  }

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
                const objectName = methodExpression.object.name;
                const propertyName = methodExpression.property.name;

                if (
                  ["describe", "test", "it"].includes(objectName) &&
                  propertyName === "each"
                ) {
                  // describe.each(table)(name, fn, timeout);
                  const variablePath = globalVariables.get(objectName);
                  if (variablePath) {
                    throw variablePath.buildCodeFrameError(
                      `Try using "${objectName}.${propertyName}" but "${objectName}" is re-declared illegally.`
                    );
                  }

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
                const objectName = methodExpression.object.name;
                const propertyName = methodExpression.property.name;

                if (
                  ["describe", "test", "it"].includes(objectName) &&
                  propertyName === "each"
                ) {
                  // describe.each`table`(name, fn, timeout);
                  const variablePath = globalVariables.get(objectName);
                  if (variablePath) {
                    throw variablePath.buildCodeFrameError(
                      `Try using "${objectName}.${propertyName}" but "${objectName}" is re-declared illegally.`
                    );
                  }

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
                const objectName = methodExpression.object.object.name;
                const propertyName = methodExpression.object.property.name;
                const subPropertyName = methodExpression.property.name;

                if (
                  ["describe", "test", "it"].includes(objectName) &&
                  (propertyName === "only" || propertyName === "skip") &&
                  subPropertyName === "each"
                ) {
                  // describe.only.each(table)(name, fn, timeout);
                  const variablePath = globalVariables.get(objectName);
                  if (variablePath) {
                    throw variablePath.buildCodeFrameError(
                      `Try using "${objectName}.${propertyName}.${subPropertyName}" but "${objectName}" is re-declared illegally.`
                    );
                  }

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
                const objectName = methodExpression.object.object.name;
                const propertyName = methodExpression.object.property.name;
                const subPropertyName = methodExpression.property.name;

                if (
                  ["describe", "test", "it"].includes(objectName) &&
                  (propertyName === "only" || propertyName === "skip") &&
                  subPropertyName === "each"
                ) {
                  // describe.only.each`table`(name, fn, timeout);
                  const variablePath = globalVariables.get(objectName);
                  if (variablePath) {
                    throw variablePath.buildCodeFrameError(
                      `Try using "${objectName}.${propertyName}.${subPropertyName}" but "${objectName}" is re-declared illegally.`
                    );
                  }

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
