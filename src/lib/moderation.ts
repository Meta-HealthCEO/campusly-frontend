/** Backend reviewPaperSchema caps comments at 2000 characters. */
export const MAX_REVIEW_COMMENT = 2000;
const MIN_CHANGE_REQUEST = 5;

export function canSendChangeRequest(comments: string): boolean {
  const note = comments.trim();
  return note.length >= MIN_CHANGE_REQUEST && comments.length <= MAX_REVIEW_COMMENT;
}
