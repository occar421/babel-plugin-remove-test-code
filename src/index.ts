// typings only
import * as babel from "@babel/core";
import { NodePath } from "@babel/traverse";

import { isValidOptions, Target } from "./utils";
import jestProcess from "./jest-process";
import magicCommentProcess from "./magic-comment-process";

const toolMap: {
  [key in Target]: (t: typeof babel.types, p: NodePath) => void
} = {
  Jest: jestProcess,
  MagicComment: magicCommentProcess
};

export default function(
  { types: t }: typeof babel,
  options: object
): babel.PluginObj {
  if (!isValidOptions(options)) {
    throw new Error(`Something invalid options.`);
  }

  const targets = new Set(
    options.targets || (["MagicComment"] as ["MagicComment"]) // as const
  );

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
