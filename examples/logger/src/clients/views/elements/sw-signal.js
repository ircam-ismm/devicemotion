import { LitElement, html, css } from 'lit-element';

class SwSignal extends LitElement {
  static get properties() {
    return {
      width: {
        type: Number,
      },
      height: {
        type: Number,
      },
      duration: {
        type: Number,
      },
      min: {
        type: Array,
      },
      max: {
        type: Array,
      },
      colors: {
        type: Array,
      }
    };
  }

  static get styles() {
    return css`
      :host {
        display: inline-block;
        box-sizing: border-box;
        /*width: 400px;
        height: 400px;
        background-color: pink;*/
        background-color: white;
        line-height: 0;
      }

      canvas {
        margin: 0;
      }
    `;
  }

  set frame(frame) {
    frame.value = Array.isArray(frame.value) ? frame.value : [frame.value];
    // need to copy values at some point
    this.frameStack.push(frame);
  }

  constructor() {
    super();

    this.width = 300;
    this.height = 150;
    this.duration = 1;
    this.colors = ['#4682B4', '#ffa500', '#00e600', '#ff0000', '#800080', '#224153'];

    this.min = -1;
    this.max = 1;

    this.frameStack = [];
    this.pixelIndex = null;


    this._renderSignal = this._renderSignal.bind(this);
  }

  render() {
    // console.log('render');
    return html`
      <canvas
        width="${this.width}"
        height="${this.height}"
        style="
          width: ${this.width}px;
          height: ${this.height}px;
        "
      ></canvas>
    `;
  }

  firstUpdated() {
    // console.log('first updated');
    this.canvas = this.shadowRoot.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');

    this.cachedCanvas = document.createElement('canvas');
    this.cachedCtx = this.cachedCanvas.getContext('2d');

    // @todo - implement pixel ratio stuff
    this.cachedCtx.canvas.width = this.width;
    this.cachedCtx.canvas.height = this.height;

    // create y scale (should be called on height, min or max change)
    const min = this.min;
    const max = this.max;
    const height = this.height;

    const a = (0 - height) / (max - min);
    const b = height - (a * min);

    this._getYPosition = (x) => a * x + b;

    super.firstUpdated();
  }

  connectedCallback() {
    // console.log('connectedCallback');
    this.frameStack.length = 0;
    this.pixelIndex = null;

    super.connectedCallback();

    this.rAFId = window.requestAnimationFrame(this._renderSignal);
  }

  disconnectedCallback() {
    console.log('disconnectedCallback');
    window.cancelAnimationFrame(this.rAFId);

    this.frameStack.length = 0;
    this.ctx.clearRect(0, 0, this.width, this.height);

    super.disconnectedCallback();
  }

  _renderSignal() {
    // console.log('yohho', this.frameStack.length, this.timeStack.length);
    const frameStackSize = this.frameStack.length;

    if (frameStackSize > 0) {

      let shiftCanvasPixels = 0;
      let abort = false;
      const pixelDuration = this.duration / this.width;

      if (this.pixelIndex === null) {
        this.pixelIndex = Math.floor(this.frameStack[0].time / pixelDuration);
      }
      // while we have some frames to display, we go through pixels and display

      while (this.frameStack.length > 0) {
        shiftCanvasPixels += 1;

        const pixelStartTime = this.pixelIndex * pixelDuration;
        const pixelStopTime = (this.pixelIndex + 1) * pixelDuration;
        // console.log(pixelStartTime, pixelStopTime, this.pixelIndex);
        let candidateIndex = null;

        // find candidates for display in current pixel
        for (let i = 0; i < this.frameStack.length; i++) {
          const frame = this.frameStack[i];
          const frameTime = frame.time;

          // ignore old pixel
          if (frameTime < pixelStartTime) {
            // if last frame in stack, abort and wait for new frames
            if (i + 1 === this.frameStack.length) {
              // console.log('im there', frameTime, pixelStartTime, this.frameStack.length, i);
              this.frameStack.length = 0;
              abort = true;
            }
          // we take the last frame we find in the pixel time interval
          } else if (frameTime >= pixelStartTime && frameTime < pixelStopTime) {
            candidateIndex = i;
          }
        }

        // we abort before incrementing this.pixelIndex,
        // as we want to recheck the same pixel with new data later
        if (abort) {
          break;
        }

        if (candidateIndex !== null) {
          const frame = this.frameStack[candidateIndex];
          // draw line since last frame
          if (this.lastFrame) {
            const width = this.width;
            const height = this.height;
            const lastFramePixel = width - shiftCanvasPixels;

            // console.log(lastFramePixel);
            // shift canvas from `shiftCanvasPixels`
            this.ctx.clearRect(0, 0, width, height);
            this.ctx.drawImage(this.cachedCanvas,
              shiftCanvasPixels, 0, lastFramePixel, height,
              0, 0, lastFramePixel, height
            );

            // console.log(frame.value.length);
            // @todo - draw scalar or vectors
            for (let i = 0; i < frame.value.length; i++) {
              // draw line between lastFrame (width - shiftCanvasPixels, y)
              // and currentFrame (width, y)
              const lastY = this._getYPosition(this.lastFrame.value[i]);
              const currentY = this._getYPosition(frame.value[i]);

              this.ctx.strokeStyle = this.colors[i];
              this.ctx.beginPath();
              this.ctx.moveTo(lastFramePixel, lastY);
              this.ctx.lineTo(width, currentY);
              this.ctx.closePath();
              this.ctx.stroke();
            }

            // save currentState into cache
            this.cachedCtx.clearRect(0, 0, width, height);
            this.cachedCtx.drawImage(this.canvas, 0, 0, width, height);
          }

          this.lastFrame = frame;
          shiftCanvasPixels = 0;

          // remove frames from stack including rendered candidate
          this.frameStack.splice(0, candidateIndex + 1);
        }

        this.pixelIndex += 1;
      } // end while
    } // end if

    this.rAFId = window.requestAnimationFrame(this._renderSignal);
  }
}

customElements.define('sw-signal', SwSignal);
