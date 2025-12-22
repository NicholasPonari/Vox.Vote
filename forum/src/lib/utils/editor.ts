
import { 
  EditorNode, 
  ContainerNode, 
  StructuralNode, 
  TextNode, 
  InlineText 
} from '../types/editor';

/**
 * Type guard to check if a node is a ContainerNode.
 * 
 * @param node - The node to check
 * @returns True if node is a ContainerNode
 * 
 * @example
 * ```typescript
 * if (isContainerNode(node)) {
 *   console.log(node.children.length);
 * }
 * ```
 */
export function isContainerNode(node: EditorNode): node is ContainerNode {
  return node.type === 'container';
}

/**
 * Type guard to check if a node is a StructuralNode (table, thead, tbody, tr).
 * 
 * @param node - The node to check
 * @returns True if node is a StructuralNode
 */
export function isStructuralNode(node: EditorNode): node is StructuralNode {
  return node.type === 'table' || node.type === 'thead' || node.type === 'tbody' || node.type === 'tr';
}

/**
 * Type guard to check if a node is a TextNode.
 * 
 * @param node - The node to check
 * @returns True if node is a TextNode
 * 
 * @example
 * ```typescript
 * if (isTextNode(node)) {
 *   console.log(node.content);
 * }
 * ```
 */
export function isTextNode(node: EditorNode): node is TextNode {
  return node.type !== 'container' && !isStructuralNode(node);
}

/**
 * Type guard to check if a node has inline children (rich text).
 * 
 * @param node - The node to check
 * @returns True if node has inline children
 * 
 * @example
 * ```typescript
 * if (hasInlineChildren(node)) {
 *   console.log(node.children); // Array of inline text segments
 * }
 * ```
 */
export function hasInlineChildren(node: EditorNode): node is TextNode & { children: InlineText[] } {
  return isTextNode(node) && Array.isArray((node as TextNode).children) && (node as TextNode).children!.length > 0;
}

/**
 * Get the text content of a node (whether simple or with inline children).
 * 
 * @param node - The node to extract text from
 * @returns The full text content
 * 
 * @example
 * ```typescript
 * const text = getNodeTextContent(node); // "Hello world!"
 * ```
 */
export function getNodeTextContent(node: TextNode): string {
  // If node has multiple lines, join them with newlines
  if (node.lines && node.lines.length > 0) {
    return node.lines
      .map(line => {
        if (line.children && line.children.length > 0) {
          return line.children.map(child => child.content).join('');
        }
        return line.content || '';
      })
      .join('\n');
  }
  
  // If node has inline children (single line with formatting)
  if (hasInlineChildren(node)) {
    return node.children!.map(child => child.content).join('');
  }
  
  // Simple content (single line, no formatting)
  return node.content || '';
}
