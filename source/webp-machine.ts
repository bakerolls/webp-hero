
import {Webp} from "../libwebp/dist/webp.js"

import {loadBinaryData} from "./load-binary-data.js"
import {detectWebpSupport} from "./detect-webp-support.js"
import {WebpMachineOptions, PolyfillDocumentOptions} from "./interfaces.js"

const relax = () => new Promise(resolve => requestAnimationFrame(resolve))

/**
 * Webp Machine
 * - decode and polyfill webp images
 * - can only decode images one-at-a-time (otherwise will throw busy error)
 */
export class WebpMachine {
	private readonly webp: Webp
	private readonly webpSupport: Promise<boolean>
	private busy = false
	private cache: {[key: string]: string} = {}

	constructor({
		webp = new Webp(),
		webpSupport = detectWebpSupport()
	}: WebpMachineOptions = {}) {
		this.webp = webp
		this.webpSupport = webpSupport
	}

	/**
	 * Decode raw webp data into a png data url
	 */
	async decode(webpData: Uint8Array): Promise<string> {
		if (this.busy) throw new Error("webp-machine decode error: busy")
		this.busy = true

		try {
			await relax()
			const canvas = document.createElement("canvas")
			this.webp.setCanvas(canvas)
			this.webp.webpToSdl(webpData, webpData.length)
			this.busy = false
			return canvas.toDataURL()
		}
		catch (error) {
			this.busy = false
			error.message = `webp-machine decode error: ${error.message}`
			throw error
		}
	}

	/**
	 * Polyfill the webp format on the given <img> element
	 */
	async polyfillImage(image: HTMLImageElement): Promise<void> {
		if (await this.webpSupport) return
		const {src} = image
		if (/\.webp$/i.test(src)) {
			if (this.cache[src]) {
				image.src = this.cache[src]
			}
			try {
				const webpData = await loadBinaryData(src)
				const pngData = await this.decode(webpData)
				image.src = this.cache[src] = pngData
			}
			catch (error) {
				error.message = `webp-machine polyfillImage failed: ${error.message}`
				throw error
			}
		}
	}

	/**
	 * Polyfill webp format on the entire web page
	 */
	async polyfillDocument({
		document = window.document
	}: PolyfillDocumentOptions = {}): Promise<void> {
		if (await this.webpSupport) return null
		for (const image of Array.from(document.querySelectorAll("img"))) {
			await this.polyfillImage(image)
		}
	}
}
