import { useEffect } from 'react';

/**
 * Imperative per-route document <head> manager for the SPA.
 *
 * Sets document.title and upserts SEO / Open Graph / Twitter / JSON-LD tags,
 * tracking every node it creates and every attribute value it overwrites so it
 * can fully restore the head on unmount or when inputs change. This prevents
 * duplicate or stale tags from piling up as the user navigates between routes.
 *
 * All DOM work happens inside a useEffect (React 19 strict friendly); the effect
 * re-runs when the serialized inputs change and returns a cleanup. No setState.
 */
export function useDocumentHead({
  title,
  description,
  canonicalPath,
  image,
  type = 'website',
  jsonLd,
} = {}) {
  // Serialize jsonLd once so the dependency array stays primitive/stable and the
  // effect doesn't re-run on every render due to a fresh object identity.
  const jsonLdString = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const head = document.head;

    // Track what we touched so cleanup is surgical.
    const createdNodes = [];
    // [{ el, attr, prevValue }] — attributes we overwrote on pre-existing nodes.
    const restoredAttrs = [];

    const brandedTitle = (() => {
      if (!title) return null;
      return /\bLoopsy\b/.test(title) ? title : `${title} · Loopsy`;
    })();

    const prevTitle = document.title;
    if (brandedTitle) document.title = brandedTitle;

    const absoluteUrl = (path) => {
      if (!path) return null;
      if (/^https?:\/\//i.test(path)) return path;
      return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
    };

    const canonicalUrl = canonicalPath ? absoluteUrl(canonicalPath) : null;
    const imageUrl = image ? absoluteUrl(image) : null;

    // Upsert a tag identified by a CSS selector + tag name. If it already exists
    // we record and overwrite the relevant attribute (so we can restore it);
    // otherwise we create it and remember to remove it on cleanup.
    const upsert = (tagName, selector, attrs, contentAttr, contentValue) => {
      if (contentValue == null || contentValue === '') return;
      let el = head.querySelector(selector);
      if (el) {
        const prev = el.getAttribute(contentAttr);
        restoredAttrs.push({ el, attr: contentAttr, prevValue: prev });
        el.setAttribute(contentAttr, contentValue);
      } else {
        el = document.createElement(tagName);
        Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        el.setAttribute(contentAttr, contentValue);
        el.setAttribute('data-doc-head', '1');
        head.appendChild(el);
        createdNodes.push(el);
      }
    };

    const meta = (name, value) =>
      upsert('meta', `meta[name="${name}"]`, { name }, 'content', value);
    const og = (property, value) =>
      upsert('meta', `meta[property="${property}"]`, { property }, 'content', value);

    // Standard SEO
    meta('description', description);

    // Canonical link
    if (canonicalUrl) {
      upsert('link', 'link[rel="canonical"]', { rel: 'canonical' }, 'href', canonicalUrl);
    }

    // Open Graph
    og('og:site_name', 'Loopsy');
    og('og:type', type);
    if (brandedTitle) og('og:title', brandedTitle);
    if (description) og('og:description', description);
    if (canonicalUrl) og('og:url', canonicalUrl);
    if (imageUrl) og('og:image', imageUrl);

    // Twitter
    meta('twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    if (brandedTitle) meta('twitter:title', brandedTitle);
    if (description) meta('twitter:description', description);
    if (imageUrl) meta('twitter:image', imageUrl);

    // JSON-LD structured data — always a fresh node we own and remove on cleanup.
    let jsonLdNode = null;
    if (jsonLdString) {
      jsonLdNode = document.createElement('script');
      jsonLdNode.type = 'application/ld+json';
      jsonLdNode.setAttribute('data-doc-head', '1');
      jsonLdNode.textContent = jsonLdString;
      head.appendChild(jsonLdNode);
      createdNodes.push(jsonLdNode);
    }

    return () => {
      if (brandedTitle) document.title = prevTitle;
      // Restore attributes we overwrote (newest-first in case of duplicates).
      for (let i = restoredAttrs.length - 1; i >= 0; i -= 1) {
        const { el, attr, prevValue } = restoredAttrs[i];
        if (prevValue == null) el.removeAttribute(attr);
        else el.setAttribute(attr, prevValue);
      }
      // Remove the nodes we created.
      createdNodes.forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    };
  }, [title, description, canonicalPath, image, type, jsonLdString]);
}
