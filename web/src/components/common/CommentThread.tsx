import { useState } from 'react'

interface Comment {
  id: string
  authorName: string
  body: string
  createdAt: string
}

interface CommentThreadProps {
  comments: Comment[]
  onAdd: (body: string) => void
  onUpdate?: (id: string, body: string) => void
  onDelete?: (id: string) => void
  currentUserId?: string
}

export default function CommentThread({
  comments,
  onAdd,
  onUpdate,
  onDelete,
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')

  const handleAdd = () => {
    if (!newComment.trim()) return
    onAdd(newComment.trim())
    setNewComment('')
  }

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id)
    setEditBody(comment.body)
  }

  const handleUpdate = () => {
    if (!editingId || !editBody.trim()) return
    onUpdate?.(editingId, editBody.trim())
    setEditingId(null)
    setEditBody('')
  }

  return (
    <div className="space-y-4">
      {/* Add comment */}
      <div className="flex gap-3">
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleAdd}
              disabled={!newComment.trim()}
              className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Comment
            </button>
          </div>
        </div>
      </div>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments yet.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border border-gray-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary-100 text-center text-xs font-bold leading-7 text-primary-700">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  {onUpdate && (
                    <button
                      onClick={() => startEdit(comment)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(comment.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {editingId === comment.id ? (
                <div>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={2}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="mt-2 flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdate}
                      className="rounded bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-gray-700">{comment.body}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
