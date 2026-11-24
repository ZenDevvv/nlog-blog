import { useNotif } from "../context/NotifContext";
import React, { useState, useRef, useEffect } from "react";

export default function AddTagBtn({tags, setTags}) {
  const { notifyError } = useNotif();
  const [addTag, setAddTag] = useState(false);
  const inputRef = useRef(null);
  const [tagValue, setTagValue] = useState('')

  useEffect(() => {
    if (addTag && inputRef.current) {
      inputRef.current.focus();
    }
  }, [addTag]);

  const handleAddTag = (e) => {
    if(addTag && tagValue) {
        const tag = tagValue.trim();
        if (!/^[A-Za-z0-9_-]{1,30}$/.test(tag)) { notifyError("Tags must be 1–30 letters, numbers, underscores or hyphens"); return; }
        if (tags.includes(tag)) { notifyError("Tag already added"); return; }
        if (tags.length >= 10) { notifyError("Use at most 10 tags"); return; }
        setTags([...tags, tag]);
        setTagValue('');
        console.log(tags)
    }
    setAddTag(!addTag);
  }

  return (
    <div className="flex gap-2">
      {addTag && (
        <input
          ref={inputRef}
          className="bg-darkBg text-white border-l border-primary w-14 focus:outline-none pl-2"
          type="text"
          maxLength={30}
          onChange={(e) => setTagValue(e.target.value)}
        />
      )}
      <button onClick={handleAddTag} className="text-primary px-4 py-2 border border-primary flex items-center gap-2 rounded-md hover:bg-primary hover:text-darkBg transition-colors duration-200">
        Add tags <span className="text-xl">+</span>
      </button>
    </div>
  );
}
