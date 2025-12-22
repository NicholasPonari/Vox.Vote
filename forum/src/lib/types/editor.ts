
export type NodeType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'p'
  | 'blockquote'
  | 'ul'
  | 'ol'
  | 'li'
  | 'code'
  | 'pre'
  | 'img'
  | 'video'
  | 'audio'
  | 'a'
  | 'span'
  | 'div'
  | 'hr'
  | 'br'
  | 'table'
  | 'thead'
  | 'tbody'
  | 'tr'
  | 'th'
  | 'td'
  | 'container'
  | 'text';

/**
 * Dynamic attributes that can be attached to any node.
 * Allows for custom styling, classes, data attributes, etc.
 * 
 * Special formatting attributes:
 * - bold: boolean - makes text bold
 * - italic: boolean - makes text italic
 * - underline: boolean - makes text underlined
 * 
 * @example
 * ```typescript
 * const attributes: NodeAttributes = {
 *   bold: true,
 *   italic: true,
 *   className: 'text-blue-500',
 *   href: 'https://example.com',
 * };
 * ```
 */
export interface NodeAttributes {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Base interface for all editor nodes.
 * Every node must have an id, type, and attributes.
 */
export interface BaseNode {
  /** Unique identifier for the node (used for updates, deletion, etc.) */
  id: string;
  
  /** The type of node (h1, p, img, container, etc.) */
  type: NodeType;
  
  /** Dynamic attributes (className, style, href, src, etc.) */
  attributes?: NodeAttributes;
}

/**
 * Inline text segment with its own formatting
 */
export interface InlineText {
  content: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  // Inline element type (for text that should render as p, h1, h2, etc. within a paragraph)
  elementType?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'code' | 'blockquote';
  // Link URL (makes the text a clickable link)
  href?: string;
  // Custom Tailwind CSS classes
  className?: string;
  // Inline CSS styles (e.g., { fontSize: '24px', color: '#ff0000' })
  styles?: Record<string, string>;
}

/**
 * A single line of content within a block.
 * Can contain either plain text or inline formatted children.
 */
export interface BlockLine {
  /** Plain text content (if no formatting) */
  content?: string;
  /** Inline children with formatting */
  children?: InlineText[];
}

/**
 * Text content node - represents actual content/text.
 * Can be simple text, have inline children with formatting, OR have multiple lines.
 * 
 * @example Simple text (no formatting):
 * ```typescript
 * const textNode: TextNode = {
 *   id: 'p-1',
 *   type: 'p',
 *   content: 'Hello, world!',
 * };
 * ```
 * 
 * @example Block with inline children (rich formatting):
 * ```typescript
 * const paragraph: TextNode = {
 *   id: 'p-1',
 *   type: 'p',
 *   children: [
 *     { content: 'Hello ', bold: false },
 *     { content: 'world', bold: true },
 *     { content: '!', bold: false }
 *   ]
 * };
 * ```
 * 
 * @example Block with multiple lines (e.g., ordered list):
 * ```typescript
 * const listItem: TextNode = {
 *   id: 'li-1',
 *   type: 'li',
 *   lines: [
 *     { content: 'First item' },
 *     { content: 'Second item' },
 *     { content: 'Third item' }
 *   ]
 * };
 * ```
 */
export interface TextNode extends BaseNode {
  type: Exclude<NodeType, 'container'>;
  
  /** The actual text content (used when no inline formatting and single line) */
  content?: string;
  
  /** Inline children with individual formatting (used for rich text, single line) */
  children?: InlineText[];
  
  /** Multiple lines of content (used for multi-line blocks like ordered lists) */
  lines?: BlockLine[];
}

/**
 * Container node - can have children nodes (nested structure).
 * Allows building complex document trees.
 * 
 * @example
 * ```typescript
 * const container: ContainerNode = {
 *   id: 'root',
 *   type: 'container',
 *   children: [
 *     { id: 'h1-1', type: 'h1', content: 'Title' },
 *     { id: 'p-1', type: 'p', content: 'Paragraph' },
 *     {
 *       id: 'nested',
 *       type: 'container',
 *       children: [...]
 *     }
 *   ]
 * };
 * ```
 */
export interface ContainerNode extends BaseNode {
  type: 'container';
  
  /** Child nodes (can be TextNode or ContainerNode) */
  children: EditorNode[];
}

/**
 * Structural node - similar to container but for specific structures like tables
 * Can have children nodes for table elements (thead, tbody, tr)
 */
export interface StructuralNode extends BaseNode {
  type: 'table' | 'thead' | 'tbody' | 'tr';
  
  /** Child nodes */
  children: EditorNode[];
}

/**
 * Union type representing any node in the editor.
 */
export type EditorNode = TextNode | ContainerNode | StructuralNode;

/**
 * Information about the current text selection
 */
export interface SelectionInfo {
  /** The selected text */
  text: string;
  
  /** Start position in the text content */
  start: number;
  
  /** End position in the text content */
  end: number;
  
  /** ID of the node containing the selection */
  nodeId: string;
  
  /** Active formatting styles on the selection */
  formats: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
  };
  
  /** Active element type on the selection (if all selected text has the same type) */
  elementType?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'code' | 'blockquote' | null;
  
  /** Active link href on the selection (if all selected text has the same href) */
  href?: string | null;
  
  /** Active custom class on the selection (if all selected text has the same class) */
  className?: string | null;
  
  /** Active inline styles on the selection (if all selected text has the same styles) */
  styles?: Record<string, string> | null;
}

/**
 * The root document state for the editor.
 * Contains metadata, the root container, UI state, and history for undo/redo.
 */
export interface EditorState {
  /** Schema version for future migrations */
  version: string;
  
  /** History stack of container states for undo/redo */
  history: ContainerNode[];
  
  /** Current position in the history stack */
  historyIndex: number;
  
  /** Currently active/focused node ID */
  activeNodeId: string | null;
  
  /** Whether there is an active text selection */
  hasSelection: boolean;
  
  /** Selection key to trigger re-renders when selection changes */
  selectionKey: number;
  
  /** Current selection information (null if no selection) */
  currentSelection: SelectionInfo | null;
  
  /** Set of block IDs that are currently selected (for multi-block operations like Ctrl+A) */
  selectedBlocks: Set<string>;
  
  /** Optional metadata (created date, last modified, author, etc.) */
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
  };
}
