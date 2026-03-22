"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, MessageSquarePlus } from "lucide-react";
import type { ArticleNote } from "@/types/database";

interface ArticleNotesProps {
  campaignId: string;
  articleId: string;
}

export function ArticleNotes({ campaignId, articleId }: ArticleNotesProps) {
  const [notes, setNotes] = useState<ArticleNote[]>([]);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchNotes();
  }, [articleId]);

  async function fetchNotes() {
    const { data } = await supabase
      .from("article_notes")
      .select("*")
      .eq("article_id", articleId)
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });
    setNotes((data || []) as ArticleNote[]);
  }

  async function addNote() {
    if (!newContent.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from("article_notes")
      .insert({
        campaign_id: campaignId,
        article_id: articleId,
        content: newContent.trim(),
      })
      .select("*")
      .single();
    if (data) {
      setNotes((prev) => [...prev, data as ArticleNote]);
      setNewContent("");
    }
    setSaving(false);
  }

  async function updateNote(noteId: string) {
    if (!editContent.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from("article_notes")
      .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .select("*")
      .single();
    if (data) {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? (data as ArticleNote) : n))
      );
      setEditingId(null);
      setEditContent("");
    }
    setSaving(false);
  }

  async function deleteNote(noteId: string) {
    await supabase.from("article_notes").delete().eq("id", noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  function formatTimestamp(ts: string) {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4" />
        Notes ({notes.length})
      </h4>

      {/* Existing notes */}
      {notes.length > 0 && (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-md border bg-muted/30 p-3 text-sm"
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[60px]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateNote(note.id)}
                      disabled={saving || !editContent.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setEditContent("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(note.created_at)}
                      {note.updated_at !== note.created_at && " (edited)"}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditContent(note.content);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => deleteNote(note.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add note form */}
      <div className="space-y-2">
        <Textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Write a note about this article..."
          className="min-h-[80px]"
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={addNote}
            disabled={saving || !newContent.trim()}
          >
            {saving ? "Saving..." : "Save Note"}
          </Button>
          {newContent.trim() && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNewContent("")}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
