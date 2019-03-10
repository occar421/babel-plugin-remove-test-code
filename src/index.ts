import * as babel from "@babel/core";

export default function(context: typeof babel): babel.PluginObj {
  const t = context.types;

  return {
    visitor: {}
  };
}
