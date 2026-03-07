import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search, MessageSquare, Trash2 } from "lucide-react";
import type { Conversation } from "@nyay/shared";
import { api } from "../../lib/api-client";

interface ConversationListProps {
  onNewConversation: () => void;
  refreshKey: number;
}

function groupConversations(conversations: Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);

  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Older", items: [] },
  ];

  for (const conv of conversations) {
    const created = new Date(conv.updated_at || conv.created_at);
    if (created >= today) groups[0].items.push(conv);
    else if (created >= yesterday) groups[1].items.push(conv);
    else groups[2].items.push(conv);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function ConversationList({ onNewConversation, refreshKey }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { id: activeId } = useParams<{ id: string }>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.chat
      .listConversations()
      .then((res) => {
        if (!cancelled && res.data) setConversations(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const filtered = search
    ? conversations.filter((c) =>
        (c.title ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  const groups = groupConversations(filtered);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.chat.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) navigate("/chat");
    } catch {
      // Silently fail — conversation stays in list
    }
  };

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 className="font-heading text-lg font-semibold text-navy-600">Chats</h2>
        <button
          onClick={onNewConversation}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-600 text-white transition-colors duration-150 hover:bg-navy-500"
          title="New Conversation"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 font-heading text-sm text-gray-700 outline-none transition-colors duration-150 placeholder:text-gray-400 focus:border-accent focus:bg-white"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="px-4 pt-8 text-center font-heading text-sm text-gray-400">
            {search ? "No matching conversations" : "No conversations yet"}
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="px-3 py-2 font-heading text-xs font-medium uppercase tracking-wider text-gray-400">
                {group.label}
              </p>
              {group.items.map((conv) => (
                <div
                  key={conv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter") navigate(`/chat/${conv.id}`); }}
                  className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                    activeId === conv.id
                      ? "bg-navy-50 text-navy-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="flex-1 truncate font-heading text-sm">
                    {conv.title ?? "New Conversation"}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition-opacity duration-150 hover:text-error group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
