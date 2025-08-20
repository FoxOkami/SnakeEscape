/**
 * Centralized tooltip utility for consistent positioning and styling across the game
 */

import { useKeyBindings } from '../stores/useKeyBindings';

export interface TooltipOptions {
  text: string;
  ctx: CanvasRenderingContext2D;
  playerX: number;
  playerY: number;
  playerWidth: number;
  fontSize?: string;
  textColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  offsetY?: number;
}

/**
 * Get the display text for a key code (e.g., "KeyE" -> "E")
 */
export function getKeyDisplayText(keyCode: string): string {
  return useKeyBindings.getState().getKeyDisplayText(keyCode);
}

/**
 * Draws a tooltip above the player's head with consistent styling
 */
export function drawPlayerTooltip(options: TooltipOptions): void {
  const {
    text,
    ctx,
    playerX,
    playerY,
    playerWidth,
    fontSize = '14px Arial',
    textColor = '#FFFFFF',
    outlineColor = '#000000',
    outlineWidth = 3,
    offsetY = 10
  } = options;

  // Save current context state
  const originalFont = ctx.font;
  const originalTextAlign = ctx.textAlign;
  const originalFillStyle = ctx.fillStyle;
  const originalStrokeStyle = ctx.strokeStyle;
  const originalLineWidth = ctx.lineWidth;

  // Set tooltip styling
  ctx.font = fontSize;
  ctx.textAlign = 'center';

  const centerX = playerX + playerWidth / 2;
  const tooltipY = playerY - offsetY;

  // Draw outline if specified
  if (outlineWidth > 0) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.strokeText(text, centerX, tooltipY);
  }

  // Draw main text
  ctx.fillStyle = textColor;
  ctx.fillText(text, centerX, tooltipY);

  // Restore context state
  ctx.font = originalFont;
  ctx.textAlign = originalTextAlign;
  ctx.fillStyle = originalFillStyle;
  ctx.strokeStyle = originalStrokeStyle;
  ctx.lineWidth = originalLineWidth;
}

/**
 * Convenience function for standard game tooltips
 */
export function drawStandardTooltip(
  text: string,
  ctx: CanvasRenderingContext2D,
  playerX: number,
  playerY: number,
  playerWidth: number
): void {
  drawPlayerTooltip({
    text,
    ctx,
    playerX,
    playerY,
    playerWidth
  });
}

/**
 * Convenience function for pickup tooltips with outline
 */
export function drawPickupTooltip(
  text: string,
  ctx: CanvasRenderingContext2D,
  playerX: number,
  playerY: number,
  playerWidth: number
): void {
  drawPlayerTooltip({
    text,
    ctx,
    playerX,
    playerY,
    playerWidth,
    fontSize: '12px Arial',
    outlineWidth: 3
  });
}

/**
 * Draw interaction tooltip with dynamic key binding
 */
export function drawInteractionTooltip(
  action: string,
  ctx: CanvasRenderingContext2D,
  playerX: number,
  playerY: number,
  playerWidth: number
): void {
  const keyBindings = useKeyBindings.getState().keyBindings;
  const keyDisplay = getKeyDisplayText(keyBindings.interact);
  drawStandardTooltip(`${keyDisplay} ${action}`, ctx, playerX, playerY, playerWidth);
}

/**
 * Draw secondary interaction tooltip with dynamic key binding
 */
export function drawSecondaryInteractionTooltip(
  action: string,
  ctx: CanvasRenderingContext2D,
  playerX: number,
  playerY: number,
  playerWidth: number
): void {
  const keyBindings = useKeyBindings.getState().keyBindings;
  const keyDisplay = getKeyDisplayText(keyBindings.secondaryInteract);
  drawStandardTooltip(`${keyDisplay} ${action}`, ctx, playerX, playerY, playerWidth);
}

/**
 * Draw rotation tooltip with both keys displayed dynamically
 */
export function drawRotationTooltip(
  ctx: CanvasRenderingContext2D,
  playerX: number,
  playerY: number,
  playerWidth: number
): void {
  const keyBindings = useKeyBindings.getState().keyBindings;
  const secondaryKey = getKeyDisplayText(keyBindings.secondaryInteract);
  const interactKey = getKeyDisplayText(keyBindings.interact);
  drawStandardTooltip(`${secondaryKey}/${interactKey} to rotate`, ctx, playerX, playerY, playerWidth);
}