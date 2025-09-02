/*
 * Keyman is copyright (C) SIL Global. MIT License.
 *
 * This helper allows mocha to process ESM imports.
 * From: https://github.com/nodejs/node/issues/51196#issuecomment-1998216742
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('ts-node/esm', pathToFileURL('./'));