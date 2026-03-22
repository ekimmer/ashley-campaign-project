"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types/database";

interface TagAutocompleteProps {
  campaignId: string;
  selectedTags: Tag[];
  onTagAdd: (tag: Tag) => void;
  onTagRemove: (tagId: string) => void;
}

export function TagAutocomplete({
  campaignId,
  selectedTags,
  onTagAdd,
  onTagRemove,
}: TagAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchTags();
  }, [campaignId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchTags() {
    const { data } = await supabase
      .from("tags")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("name");
    setAllTags((data || []) as Tag[]);
  }

  const filteredTags = allTags.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) &&
      !selectedTags.some((st) => st.id === t.id)
  );

  const showCreateOption =
    query.trim().length > 0 &&
    !allTags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  // Build options list for keyboard nav
  const options: Array<{ type: "existing"; tag: Tag } | { type: "create"; name: string }> = [
    ...filteredTags.map((tag) => ({ type: "existing" as const, tag })),
    ...(showCreateOption ? [{ type: "create" as const, name: query.trim() }] : []),
  ];

  async function createTag(name: string) {
    const { data } = await supabase
      .from("tags")
      .insert({ campaign_id: campaignId, name: name.trim() })
      .select("*")
      .single();
    if (data) {
      const newTag = data as Tag;
      onTagAdd(newTag);
      setAllTags((prev) => [...prev, newTag]);
    }
    setQuery("");
    setShowDropdown(false);
  }

  function selectExistingTag(tag: Tag) {
    onTagAdd(tag);
    setQuery("");
    setShowDropdown(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || options.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = options[highlightIndex];
      if (option) {
        if (option.type === "existing") {
          selectExistingTag(option.tag);
        } else {
          createTag(option.name);
        }
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {tag.name}
              <button
                onClick={() => onTagRemove(tag.id)}
                className="ml-0.5 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
            setHighlightIndex(0);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag..."
          className="h-8 text-sm"
        />

        {/* Dropdown */}
        {showDropdown && options.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md max-h-48 overflow-y-auto"
          >
            {options.map((option, index) => {
              if (option.type === "existing") {
                return (
                  <button
                    key={option.tag.id}
                    onClick={() => selectExistingTag(option.tag)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                      highlightIndex === index && "bg-muted"
                    )}
                  >
                    {option.tag.name}
                  </button>
                );
              }
              return (
                <button
                  key="__create__"
                  onClick={() => createTag(option.name)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 text-primary",
                    highlightIndex === index && "bg-muted"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create tag: &ldquo;{option.name}&rdquo;
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
