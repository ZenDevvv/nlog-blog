import React, { useState, useRef, useEffect } from "react";

export default function AddTagBtn({tags, setTags}) {
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
        setTags([...tags, tagValue.replace(/\s+/g, '')]);
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
          onChange={(e) => setTagValue(e.target.value)}
        />
      )}
      <button onClick={handleAddTag} className="text-primary px-4 py-2 border border-primary flex items-center gap-2 rounded-md hover:bg-primary hover:text-darkBg transition-colors duration-200">
        Add tags <span className="text-xl">+</span>
      </button>
    </div>
  );
}
