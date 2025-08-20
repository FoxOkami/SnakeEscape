/**
 * Centralized tooltip utility for consistent positioning and styling across the game
 */

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