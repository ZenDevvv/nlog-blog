import { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

// Keep Quill's DOM outside React's child reconciliation and use its clipboard
// converter for incoming HTML instead of assigning untrusted HTML to the DOM.
export default function RichTextEditor({ value, onChange, placeholder, className }) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const lastHtmlRef = useRef(null);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    const element = document.createElement("div");
    container.appendChild(element);
    const editor = new Quill(element, {
      theme: "snow",
      placeholder,
      modules: { toolbar: false },
      formats: ["bold", "italic", "underline", "strike", "blockquote", "code-block", "list", "header"],
    });
    editorRef.current = editor;
    const handleChange = () => {
      const html = editor.getSemanticHTML();
      lastHtmlRef.current = html;
      onChangeRef.current(html);
    };
    editor.on("text-change", handleChange);
    return () => {
      editor.off("text-change", handleChange);
      editor.disable();
      editorRef.current = null;
      lastHtmlRef.current = null;
      container.replaceChildren();
    };
  }, [placeholder]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && value !== lastHtmlRef.current) {
      editor.setContents(editor.clipboard.convert({ html: value || "" }), "silent");
      lastHtmlRef.current = value;
    }
  }, [value, placeholder]);

  return <div ref={containerRef} className={className} />;
}
