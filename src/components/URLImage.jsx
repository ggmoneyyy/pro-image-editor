import React, { useRef, useEffect } from 'react';
import { Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';

const URLImage = ({ shapeProps, isSelected, onSelect, onChange, keepRatio, canvasWidth, canvasHeight, isDraggable }) => {
  const [image] = useImage(shapeProps.src, 'anonymous');
  const shapeRef = useRef();
  const trRef = useRef();

  const isVisible = shapeProps.visible !== false;

  useEffect(() => {
    if (isSelected && isVisible && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, isVisible, shapeProps]); 

  useEffect(() => {
    if (image && shapeRef.current) {
      if (shapeProps.blur > 0) {
        shapeRef.current.cache();
      } else {
        shapeRef.current.clearCache();
      }
    }
  }, [image, shapeProps.blur, shapeProps.width, shapeProps.height]);

  const handleDragMove = (e) => {
    const SNAP_OFFSET = 20; 
    const node = e.target;
    let newX = node.x();
    let newY = node.y();
    
    const width = node.width() * node.scaleX();
    const height = node.height() * node.scaleY();

    if (Math.abs(newX) < SNAP_OFFSET) newX = 0; 
    if (Math.abs(newX + width - canvasWidth) < SNAP_OFFSET) newX = canvasWidth - width; 
    if (Math.abs(newX + width/2 - canvasWidth/2) < SNAP_OFFSET) newX = canvasWidth/2 - width/2; 

    if (Math.abs(newY) < SNAP_OFFSET) newY = 0; 
    if (Math.abs(newY + height - canvasHeight) < SNAP_OFFSET) newY = canvasHeight - height; 
    if (Math.abs(newY + height/2 - canvasHeight/2) < SNAP_OFFSET) newY = canvasHeight/2 - height/2; 

    node.x(newX);
    node.y(newY);

    // NEW: Smoothly move the mask boundary in real-time during drag
    if (shapeProps.mask && shapeProps.mask.linked && shapeProps.mask.enabled) {
        const deltaX = newX - shapeProps.x;
        const deltaY = newY - shapeProps.y;
        if (node.parent && typeof node.parent.clipX === 'function') {
            node.parent.clipX(shapeProps.mask.x + deltaX);
            node.parent.clipY(shapeProps.mask.y + deltaY);
        }
    }
  };

  return (
    <React.Fragment>
      <KonvaImage
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        image={image}
        {...shapeProps}
        visible={isVisible}
        draggable={isDraggable !== false}
        opacity={shapeProps.opacity !== undefined ? shapeProps.opacity / 100 : 1}
        globalCompositeOperation={shapeProps.blendMode || 'source-over'}
        cornerRadius={shapeProps.cornerRadius || 0}
        filters={shapeProps.blur > 0 ? [Konva.Filters.Blur] : []}
        blurRadius={shapeProps.blur || 0}
        shadowColor="rgba(0,0,0,0.6)"
        shadowBlur={shapeProps.shadow ? 30 : 0}
        shadowOffsetY={shapeProps.shadow ? 15 : 0}
        shadowOpacity={shapeProps.shadow ? 1 : 0}
        onDragMove={handleDragMove}
        
        // UPDATED: Save the updated linked mask coordinates when you drop the image
        onDragEnd={(e) => {
          const newX = e.target.x();
          const newY = e.target.y();
          const deltaX = newX - shapeProps.x;
          const deltaY = newY - shapeProps.y;

          let newMask = shapeProps.mask;
          if (newMask && newMask.linked) {
              newMask = { ...newMask, x: newMask.x + deltaX, y: newMask.y + deltaY };
          }

          onChange({
            ...shapeProps,
            x: newX,
            y: newY,
            mask: newMask
          });
        }}
        
        // UPDATED: Scale the mask perfectly if the image is resized
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          const newX = node.x();
          const newY = node.y();
          const newWidth = Math.max(5, node.width() * scaleX);
          const newHeight = Math.max(5, node.height() * scaleY);

          let newMask = shapeProps.mask;
          if (newMask && newMask.linked) {
              const offsetX = newMask.x - shapeProps.x;
              const offsetY = newMask.y - shapeProps.y;
              newMask = {
                  ...newMask,
                  x: newX + (offsetX * scaleX),
                  y: newY + (offsetY * scaleY),
                  width: newMask.width * scaleX,
                  height: newMask.height * scaleY
              };
          }

          onChange({
            ...shapeProps,
            x: newX,
            y: newY,
            rotation: node.rotation(),
            width: newWidth,
            height: newHeight,
            mask: newMask
          });
        }}
      />
      {isSelected && isVisible && (
        <Transformer
          ref={trRef}
          keepRatio={keepRatio} 
          enabledAnchors={
              keepRatio 
                ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                : ['top-left', 'top-center', 'top-right', 'middle-right', 'bottom-right', 'bottom-center', 'bottom-left', 'middle-left']
          }
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
          borderStroke="#3b82f6"
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          anchorSize={10}
        />
      )}
    </React.Fragment>
  );
};

export default URLImage;