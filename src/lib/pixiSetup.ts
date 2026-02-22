/**
 * Project Pyari — PixiJS Component Registration
 * -----------------------------------------------
 * @pixi/react uses extend() for tree-shaking. We register only
 * the PixiJS primitives the project actually needs.
 */

import { extend } from '@pixi/react';
import { Container, Sprite, Graphics, Text as PixiText, Application, BlurFilter, Assets } from 'pixi.js';

extend({
  Container,
  Sprite,
  Graphics,
  PixiText,
  Application,
});

export { Container, Sprite, Graphics, PixiText, Application, BlurFilter, Assets };
