"use client";

import React, {
	useRef,
	useEffect,
	useState,
	useCallback,
	useMemo,
} from "react";
import { TextNode, EditorNode, ContainerNode } from "@/lib/types/editor";
import { isContainerNode, getNodeTextContent } from "@/lib/utils/editor";
import { ImageBlock } from "./ImageBlock";
import { VideoBlock } from "./VideoBlock";
import { CommandMenu } from "./CommandMenu";
import { useEditor } from "@/lib/context/EditorContext";
import { GripVertical } from "lucide-react";
import { BlockContextMenu } from "./BlockContextMenu";
import { FlexContainer } from "./FlexContainer";
import { TableBuilder } from "./TableBuilder";

// Import all block handlers
import {
	buildHTML,
	saveSelection,
	restoreSelection,
	getTypeClassName,
	createHandleCompositionStart,
	createHandleCompositionEnd,
	createHandleInput,
	createHandleKeyDown,
	createHandleClick,
	createHandleCommandSelect,
	createHandleBackgroundColorChange,
	createHandleBlockDragStart,
	createHandleBlockDragEnd,
} from "@/lib/handlers/block";

interface BlockProps {
	node: EditorNode;
	isActive: boolean;
	nodeRef: (el: HTMLElement | null) => void;
	onInput: (element: HTMLElement) => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
	onClick: () => void;
	onDelete?: (nodeId?: string) => void;
	onCreateNested?: (nodeId: string) => void;
	depth?: number;
	readOnly?: boolean;
	onImageDragStart?: (nodeId: string) => void;
	onChangeBlockType?: (nodeId: string, newType: TextNode["type"]) => void;
	onInsertImage?: (nodeId: string) => void;
	onCreateList?: (nodeId: string, listType: string) => void;
	onUploadImage?: (file: File) => Promise<string>;
	onBlockDragStart?: (nodeId: string) => void;
	selectedImageIds?: Set<string>;
	onToggleImageSelection?: (nodeId: string) => void;
	onClickWithModifier?: (e: React.MouseEvent, nodeId: string) => void;
	onFlexContainerDragOver?: (
		e: React.DragEvent,
		flexId: string,
		position: "left" | "right" | null
	) => void;
	onFlexContainerDragLeave?: (e: React.DragEvent) => void;
	onFlexContainerDrop?: (
		e: React.DragEvent,
		flexId: string,
		position: "left" | "right" | null
	) => void;
	dragOverFlexId?: string | null;
	flexDropPosition?: "left" | "right" | null;
}

export function Block(props: BlockProps) {
	const { node } = props;
	if (isContainerNode(node)) {
		return <ContainerBlock {...props} node={node as ContainerNode} />;
	}
	return <TextBlock {...props} node={node as TextNode} />;
}

function ContainerBlock({
	node,
	isActive,
	nodeRef,
	onInput,
	onKeyDown,
	onClick,
	onDelete,
	onCreateNested,
	depth = 0,
	readOnly = false,
	onImageDragStart,
	onChangeBlockType,
	onInsertImage,
	onCreateList,
	onUploadImage,
	onBlockDragStart,
	selectedImageIds,
	onToggleImageSelection,
	onClickWithModifier,
	onFlexContainerDragOver,
	onFlexContainerDragLeave,
	onFlexContainerDrop,
	dragOverFlexId,
	flexDropPosition,
}: BlockProps & { node: ContainerNode }) {
	const containerNode = node;
	const firstChild = containerNode.children[0];
	const isTableWrapper = firstChild?.type === "table";
	const [, dispatch] = useEditor();

	if (isTableWrapper) {
		return (
			<TableBuilder
				key={node.id}
				node={containerNode}
				onUpdate={(id, updates) => {
					if (dispatch) {
						dispatch({
							type: "UPDATE_NODE",
							payload: { id, updates },
						});
					}
				}}
				readOnly={readOnly}
				onBlockDragStart={onBlockDragStart}
			/>
		);
	}

	const layoutType = containerNode.attributes?.layoutType as string | undefined;
	const isFlexContainer = layoutType === "flex";

	const listTypeFromAttribute = containerNode.attributes?.listType as
		| string
		| undefined;
	const listTypeFromChild =
		firstChild &&
		(firstChild.type === "ul" ||
			firstChild.type === "ol" ||
			firstChild.type === "li")
			? firstChild.type === "li"
				? "ul"
				: firstChild.type
			: null;

	const listType = listTypeFromAttribute || listTypeFromChild;
	const isListContainer = !!listType;

	const ContainerElement =
		listType === "ul" ? "ul" : listType === "ol" ? "ol" : "div";

	const containerClasses = isFlexContainer
		? ``
		: isListContainer
		? `list-none pl-0 ml-6`
		: `border-l-2 border-border/50 pl-2 ml-6 transition-all ${
				isActive ? "border-primary" : "hover:border-border"
		  }`;

	if (isFlexContainer) {
		return (
			<FlexContainer
				key={node.id}
				node={containerNode}
				onDragOver={(e, position) => {
					if (onFlexContainerDragOver) {
						onFlexContainerDragOver(e, node.id, position);
					}
				}}
				onDragLeave={onFlexContainerDragLeave}
				onDrop={(e, position) => {
					if (onFlexContainerDrop) {
						onFlexContainerDrop(e, node.id, position);
					}
				}}
				dragOverPosition={dragOverFlexId === node.id ? flexDropPosition : null}
			>
				{containerNode.children.map((childNode) => {
					const isChildMedia =
						childNode &&
						"type" in childNode &&
						(childNode.type === "img" || childNode.type === "video");

					const blockContent = (
						<Block
							key={childNode.id}
							node={childNode}
							isActive={isActive}
							nodeRef={nodeRef}
							onInput={onInput}
							onKeyDown={(e) => {
								onKeyDown(e);
							}}
							onClick={onClick}
							onDelete={
								isChildMedia && onDelete
									? () => onDelete(childNode.id)
									: undefined
							}
							onCreateNested={onCreateNested}
							depth={depth + 1}
							readOnly={readOnly}
							onImageDragStart={onImageDragStart}
							onChangeBlockType={onChangeBlockType}
							onInsertImage={onInsertImage}
							onCreateList={onCreateList}
							onUploadImage={onUploadImage}
							selectedImageIds={selectedImageIds}
							onToggleImageSelection={onToggleImageSelection}
							onClickWithModifier={onClickWithModifier}
							onFlexContainerDragOver={onFlexContainerDragOver}
							onFlexContainerDragLeave={onFlexContainerDragLeave}
							onFlexContainerDrop={onFlexContainerDrop}
							dragOverFlexId={dragOverFlexId}
							flexDropPosition={flexDropPosition}
						/>
					);

					return (
						<div key={childNode.id} className="flex-1 min-w-[280px] max-w-full">
							{blockContent}
						</div>
					);
				})}
			</FlexContainer>
		);
	}

	return (
		<ContainerElement
			key={node.id}
			data-node-id={node.id}
			data-node-type="container"
			data-list-type={listType || undefined}
			className={containerClasses}
		>
			{containerNode.children.map((childNode) => {
				const isChildMedia =
					childNode &&
					"type" in childNode &&
					(childNode.type === "img" || childNode.type === "video");

				const blockContent = (
					<Block
						key={childNode.id}
						node={childNode}
						isActive={isActive}
						nodeRef={nodeRef}
						onInput={onInput}
						onKeyDown={(e) => {
							onKeyDown(e);
						}}
						onClick={onClick}
						onDelete={
							isChildMedia && onDelete
								? () => onDelete(childNode.id)
								: undefined
						}
						onCreateNested={onCreateNested}
						depth={depth + 1}
						readOnly={readOnly}
						onImageDragStart={onImageDragStart}
						onChangeBlockType={onChangeBlockType}
						onInsertImage={onInsertImage}
						onCreateList={onCreateList}
						onUploadImage={onUploadImage}
						selectedImageIds={selectedImageIds}
						onToggleImageSelection={onToggleImageSelection}
						onClickWithModifier={onClickWithModifier}
						onFlexContainerDragOver={onFlexContainerDragOver}
						onFlexContainerDragLeave={onFlexContainerDragLeave}
						onFlexContainerDrop={onFlexContainerDrop}
						dragOverFlexId={dragOverFlexId}
						flexDropPosition={flexDropPosition}
					/>
				);

				return blockContent;
			})}
		</ContainerElement>
	);
}

function TextBlock({
	node,
	isActive,
	nodeRef,
	onInput,
	onKeyDown,
	onClick,
	onDelete,
	onCreateNested,
	depth = 0,
	readOnly = false,
	onImageDragStart,
	onChangeBlockType,
	onInsertImage,
	onCreateList,
	onUploadImage,
	onBlockDragStart,
	selectedImageIds,
	onToggleImageSelection,
	onClickWithModifier,
}: BlockProps & { node: TextNode }) {
	const textNode = node;
	const localRef = useRef<HTMLElement | null>(null);
	const isComposingRef = useRef(false);
	const shouldPreserveSelectionRef = useRef(false);
	const [isHovering, setIsHovering] = useState(false);
	const [state, dispatch] = useEditor();
	const [showCommandMenu, setShowCommandMenu] = useState(false);
	const [commandMenuAnchor, setCommandMenuAnchor] =
		useState<HTMLElement | null>(null);

	const currentContainer = state.history[state.historyIndex];

	const memoizedBuildHTML = useCallback(() => {
		return buildHTML(textNode);
	}, [textNode]);

	const memoizedSaveSelection = useCallback(() => {
		return saveSelection(localRef);
	}, []);

	const memoizedRestoreSelection = useCallback(
		(
			savedSelection: { start: number; end: number; collapsed: boolean } | null
		) => {
			restoreSelection(localRef, savedSelection);
		},
		[]
	);

	useEffect(() => {
		if (!localRef.current) return;
		if (isComposingRef.current || shouldPreserveSelectionRef.current) return;
		const element = localRef.current;
		const newHTML = memoizedBuildHTML();
		if (element.innerHTML !== newHTML) {
			const hadFocus = document.activeElement === element;
			const savedSelectionData = hadFocus ? memoizedSaveSelection() : null;
			element.innerHTML = newHTML;
			if (hadFocus && savedSelectionData) {
				memoizedRestoreSelection(savedSelectionData);
			}
		}
	}, [memoizedBuildHTML, memoizedSaveSelection, memoizedRestoreSelection]);

	const handleCompositionStart = useMemo(
		() => createHandleCompositionStart()(isComposingRef),
		[]
	);
	const handleCompositionEnd = useMemo(
		() => createHandleCompositionEnd()(isComposingRef),
		[]
	);

	const handleInputCb = useMemo(
		() =>
			createHandleInput({
				textNode,
				readOnly,
				onInput,
				onChangeBlockType,
				showCommandMenu,
				setShowCommandMenu,
				setCommandMenuAnchor,
				shouldPreserveSelectionRef,
			}),
		[textNode, readOnly, onInput, onChangeBlockType, showCommandMenu]
	);

	const handleKeyDownCb = useMemo(
		() =>
			createHandleKeyDown({
				textNode,
				readOnly,
				onInput,
				onKeyDown,
				onClick,
				onCreateNested,
				onChangeBlockType,
				onInsertImage,
				onCreateList,
				currentContainer,
				dispatch,
				localRef,
				isComposingRef,
				shouldPreserveSelectionRef,
				showCommandMenu,
				setShowCommandMenu,
				setCommandMenuAnchor,
			}),
		[
			textNode,
			readOnly,
			onKeyDown,
			onCreateNested,
			showCommandMenu,
			currentContainer,
			dispatch,
			onChangeBlockType,
			onInsertImage,
			onCreateList,
			onClick,
			onInput,
		]
	);

	const handleClickCb = useMemo(
		() => createHandleClick({ readOnly, onClick }),
		[readOnly, onClick]
	);

	const handleCommandSelect = useMemo(
		() =>
			createHandleCommandSelect({
				textNode,
				onChangeBlockType,
				onInsertImage,
				onCreateList,
				localRef,
				setShowCommandMenu,
				setCommandMenuAnchor,
			}),
		[textNode, onChangeBlockType, onInsertImage, onCreateList]
	);

	const handleBackgroundColorChange = useMemo(
		() => createHandleBackgroundColorChange(textNode, dispatch),
		[textNode, dispatch]
	);

	const handleBlockDragStartFn = useMemo(
		() => createHandleBlockDragStart(textNode, onBlockDragStart),
		[textNode, onBlockDragStart]
	);
	const handleBlockDragEndFn = useMemo(() => createHandleBlockDragEnd(), []);

	const textContent = getNodeTextContent(textNode);
	const isEmpty = !textContent || textContent.trim() === "";
	const showPlaceholder = isEmpty && isActive && !readOnly && onChangeBlockType;

	// Early returns moved after hooks to satisfy rules-of-hooks
	if (textNode.type === "img") {
		return (
			<ImageBlock
				node={textNode}
				isActive={isActive}
				onClick={onClick}
				onDelete={onDelete}
				onDragStart={onImageDragStart}
				isSelected={selectedImageIds?.has(textNode.id)}
				onToggleSelection={onToggleImageSelection}
				onClickWithModifier={onClickWithModifier}
			/>
		);
	}

	if (textNode.type === "video") {
		return (
			<VideoBlock
				node={textNode}
				isActive={isActive}
				onClick={onClick}
				onDelete={onDelete}
				onDragStart={onImageDragStart}
				isSelected={selectedImageIds?.has(textNode.id)}
				onToggleSelection={onToggleImageSelection}
				onClickWithModifier={onClickWithModifier}
			/>
		);
	}

	if (textNode.type === "br") {
		return (
			<div
				key={textNode.id}
				data-node-id={textNode.id}
				className="h-6"
				onClick={onClick}
			/>
		);
	}

	const ElementType =
		textNode.type === "li"
			? "li"
			: textNode.type === "h1"
			? "h1"
			: textNode.type === "h2"
			? "h2"
			: textNode.type === "h3"
			? "h3"
			: textNode.type === "h4"
			? "h4"
			: textNode.type === "h5"
			? "h5"
			: textNode.type === "h6"
			? "h6"
			: textNode.type === "p"
			? "p"
			: textNode.type === "blockquote"
			? "blockquote"
			: textNode.type === "code"
			? "pre"
			: "div";

	const isListItem = textNode.type === "li";
	const customClassName = textNode.attributes?.className || "";
	const isHexColor =
		typeof customClassName === "string" && customClassName.startsWith("#");
	const textColor = isHexColor ? customClassName : "";
	const className = isHexColor ? "" : (customClassName as string);
	const backgroundColor = textNode.attributes?.backgroundColor as
		| string
		| undefined;

	const commonProps = {
		key: textNode.id,
		"data-node-id": textNode.id,
		"data-node-type": textNode.type,
		contentEditable: !readOnly,
		suppressContentEditableWarning: true,
		className: `
      ${isListItem ? "relative" : ""}
      ${getTypeClassName(textNode.type)}
      ${className}
      ${readOnly ? "" : "outline-none focus:ring-1 focus:ring-border/50"}
      rounded-lg px-3 py-2 mb-2
      transition-all
      ${!readOnly && isActive ? "ring-1 ring-border/50 bg-accent/5" : ""}
      ${!readOnly ? "hover:bg-accent/5" : ""}
      ${readOnly ? "cursor-default" : ""}
    `,
		style: {
			marginLeft: `${depth * 0.5}rem`,
			...(textColor ? { color: textColor as string } : {}),
			...(backgroundColor ? { backgroundColor: backgroundColor } : {}),
		},
		spellCheck: false,
	} as const;

	return (
		<>
			<BlockContextMenu
				readOnly={readOnly}
				onBackgroundColorChange={handleBackgroundColorChange}
				currentBackgroundColor={backgroundColor}
			>
				<div
					className="relative group"
					style={{
						paddingLeft: readOnly ? "0" : "28px",
						marginLeft: readOnly ? "0" : "-28px",
					}}
					onMouseEnter={() => !readOnly && setIsHovering(true)}
					onMouseLeave={() => !readOnly && setIsHovering(false)}
				>
					{!readOnly && isHovering && onBlockDragStart && (
						<div
							draggable
							onDragStart={handleBlockDragStartFn}
							onDragEnd={handleBlockDragEndFn}
							className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
							onClick={(e) => e.stopPropagation()}
							onMouseDown={(e) => e.stopPropagation()}
						>
							<GripVertical
								className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors duration-200"
								strokeWidth={1.5}
							/>
						</div>
					)}

					<ElementType
						{...commonProps}
						key={textNode.id}
						ref={(el: HTMLElement | null) => {
							localRef.current = el;
							nodeRef(el);
						}}
						onInput={readOnly ? undefined : handleInputCb}
						onKeyDown={readOnly ? undefined : handleKeyDownCb}
						onClick={handleClickCb}
						onCompositionStart={readOnly ? undefined : handleCompositionStart}
						onCompositionEnd={readOnly ? undefined : handleCompositionEnd}
					/>

					{showPlaceholder && (
						<div
							className="absolute top-2 pointer-events-none text-muted-foreground/50 select-none"
							style={{
								left: readOnly ? "0.75rem" : "calc(28px + 0.75rem)",
								marginLeft: `${depth * 0.5}rem`,
							}}
						>
							Type / for commands...
						</div>
					)}
				</div>
			</BlockContextMenu>

			{!readOnly && (
				<CommandMenu
					isOpen={showCommandMenu}
					onClose={() => setShowCommandMenu(false)}
					onSelect={handleCommandSelect}
					anchorElement={commandMenuAnchor}
					nodeId={textNode.id}
					onUploadImage={onUploadImage}
				/>
			)}
		</>
	);
}
