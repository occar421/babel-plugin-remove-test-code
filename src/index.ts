// typings only
import * as babel from "@babel/core";
import { NodePath } from "@babel/traverse";
import { isValidOptions, Target } from "./utils";
import jestProcess from "./jest-process";

const toolMap: {
  [key in Target]: (t: typeof babel.types, p: NodePath) => void
} = {
  Jest: jestProcess
};

export default function(
  { types: t }: typeof babel,
  options: object
): babel.PluginObj {
  if (!isValidOptions(options)) {
    throw new Error(`Something invalid options.`);
  }

  // TODO default options
  const targets = new Set(options.targets);
  if (targets.size === 0) {
    throw Error(
      `Default options are not defined yet. Please specify "targets" as "Jest".`
    );
  }

  return {
    visitor: {
      Program(programPath: NodePath) {
        for (let target of targets) {
          toolMap[target](t, programPath);
        }
      }
    }
  };
}
