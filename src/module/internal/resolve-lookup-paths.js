// Based on `Module._resolveLookupPaths()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import ENV from "../../constant/env.js"
import ESM from "../../constant/esm.js"

import GenericArray from "../../generic/array.js"
import Module from "../../module.js"

import { dirname } from "../../safe/path.js"
import esmState from "../esm/state.js"
import isRelative from "../../path/is-relative.js"
import staticNodeModulePaths from "../static/node-module-paths.js"

const {
  RUNKIT
} = ENV

const {
  PKG_DIRNAME
} = ESM

let availableModulesPath

function resolveLookupPaths(request, parent, skipGlobalPaths) {
  const parentFilename = parent && parent.filename

  // Look outside if not a relative path.
  if (! isRelative(request)) {
    const parentPaths = parent && parent.paths

    const paths = parentPaths
      ? GenericArray.from(parentPaths)
      : GenericArray.of()

    if (parentPaths &&
        ! skipGlobalPaths) {
      GenericArray.push(paths, ...esmState.globalPaths)
    }

    if (RUNKIT) {
      if (availableModulesPath === void 0) {
        availableModulesPath = dirname(PKG_DIRNAME)
      }

      paths.push(availableModulesPath)
    }

    return paths.length ? paths : null
  }

  if (typeof parentFilename === "string") {
    return GenericArray.of(dirname(parentFilename))
  }

  const paths = skipGlobalPaths
    ? staticNodeModulePaths(".")
    : Module._nodeModulePaths(".")

  GenericArray.unshift(paths, ".")
  return paths
}

export default resolveLookupPaths
