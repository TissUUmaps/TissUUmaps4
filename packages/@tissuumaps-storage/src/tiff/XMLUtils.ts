/** Helpers for the XML image descriptions of OME-TIFF and QPTIFF */
export class XMLUtils {
  /**
   * Parses an XML document
   *
   * @param text - The document text
   * @returns The root element, or `undefined` if not well-formed XML
   */
  static parse(text: string | undefined): Element | undefined {
    const xml = text?.trim();
    if (xml === undefined || !xml.startsWith("<")) {
      return undefined;
    }
    const document = new DOMParser().parseFromString(xml, "application/xml");
    if (document.getElementsByTagName("parsererror").length > 0) {
      return undefined;
    }
    return document.documentElement;
  }

  /**
   * Returns the direct children with the given local name
   *
   * @param element - The parent
   * @param tagName - The local name (OME-XML is namespaced)
   * @returns The children, in document order
   */
  static getChildren(element: Element, tagName: string): Element[] {
    return [...element.children].filter((child) => child.localName === tagName);
  }

  /**
   * Returns the trimmed text of the first direct child with the given name
   *
   * @param element - The parent
   * @param tagName - The child's local name
   * @returns The text, or `undefined` if there is no such child or it is empty
   */
  static getChildText(element: Element, tagName: string): string | undefined {
    return (
      XMLUtils.getChildren(element, tagName)[0]?.textContent?.trim() ||
      undefined
    );
  }

  /**
   * Returns an integer attribute
   *
   * @param element - The element
   * @param name - The attribute name
   * @param defaultValue - Returned if the attribute is missing or not an integer
   * @returns The value
   */
  static getIntAttribute(
    element: Element,
    name: string,
    defaultValue: number,
  ): number {
    const value = Number.parseInt(element.getAttribute(name) ?? "", 10);
    return Number.isFinite(value) ? value : defaultValue;
  }
}
