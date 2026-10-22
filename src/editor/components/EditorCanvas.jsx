import { bounds, boxStyle } from '../model/geometry.js'
import { selectedImages, selectedRegion } from '../model/selection.js'
import { navigationWidth, canvasBox, regionBounds, TRANSPARENCY_TILE_SIZE } from '../model/layout.js'
import SourceImage from './SourceImage.jsx'
import ResultImages from './ResultImages.jsx'
import ImageOperations from './ImageOperations.jsx'
import SelectionBox from './SelectionBox.jsx'
import RegionMask from './RegionMask.jsx'

export default function EditorCanvas({
  document,
  stage,
  view,
  tool,
  spaceHeld,
  boardRef,
  marquee,
  isSelectingRegion = false,
  promptOpen = false,
  boundsEditing = false,
  cropImageId,
  pointerHandlers,
  actions,
  children,
}) {
  const images = boundsEditing ? [] : selectedImages(document)
  const selectionBounds = bounds(images)
  const selectingRegion = boundsEditing ? null : selectedRegion(document)
  const showResults = document.results.length > 0
  const position = { x: stage.offset.x + view.x, y: stage.offset.y + view.y }
  const selectionBox = selectingRegion
    ? regionBounds(document.region, document.imageFrame)
    : selectionBounds
  const maskedRegion = selectingRegion && document.region.outline
  const rectangleEditable =
    selectingRegion && !maskedRegion && tool === 'rectangle' && !isSelectingRegion

  return (
    <section
      ref={boardRef}
      className={`workspace tool-${spaceHeld ? 'hand' : tool}`}
      aria-label="Image canvas"
      style={{ '--transparency-tile': `${TRANSPARENCY_TILE_SIZE}px` }}
      {...pointerHandlers}
    >
      <div
        className="canvas-texture"
        style={{ backgroundPosition: `${view.x - navigationWidth(stage)}px ${view.y}px` }}
      />
      <div
        className="canvas-world"
        style={{ transform: `translate(${position.x}px,${position.y}px) scale(${view.zoom})` }}
      >
        <SourceImage document={document} hidden={cropImageId === document.imageId} onSelect={actions.selectImage} onCrop={tool === 'cursor' ? actions.cropImage : undefined} />
        {showResults && (
          <ResultImages
            results={document.results}
            selected={document.selected}
            onEdit={actions.editResult}
            onSelect={actions.selectImage}
            onCrop={tool === 'cursor' ? actions.cropImage : undefined}
            hiddenImageId={cropImageId}
          />
        )}
      </div>
      {!selectingRegion &&
        images.length > 1 &&
        images.map((image) => (
          <SelectionBox
            key={image.id}
            box={canvasBox(image, stage, view)}
            className="individual-image-selection"
            handles={false}
          />
        ))}
      {maskedRegion ? (
        <RegionMask
          region={document.region}
          frame={document.imageFrame}
          stage={stage}
          view={view}
          drawing={isSelectingRegion}
        />
      ) : (
        <SelectionBox
          box={canvasBox(selectionBox, stage, view)}
          className={selectingRegion ? 'region-selection' : 'result-selection'}
          dashed={Boolean(selectingRegion)}
          resizeTarget={rectangleEditable ? 'region' : !selectingRegion ? 'images' : undefined}
          movable={Boolean(rectangleEditable)}
        />
      )}
      {marquee && <div className="marquee" style={boxStyle(canvasBox(marquee, stage, view))} />}
      {selectionBounds && !selectingRegion && !isSelectingRegion && !promptOpen && (
        <ImageOperations
          bounds={selectionBounds}
          stage={stage}
          view={view}
          onEdit={actions.editSelected}
          onDownload={actions.downloadSelected}
          onDelete={actions.deleteSelected}
        />
      )}
      {children}
    </section>
  )
}
