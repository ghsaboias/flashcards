import { memo } from 'react'
import { createPortal } from 'react-dom'
import type { NewCardsDetectionResponse } from '../types/api-types'

interface NewCardsPromptProps {
  detection: NewCardsDetectionResponse
  onContinueWithNew: () => void
  onPracticeOnly: () => void
  onBrowseFirst: () => void
  onCancel: () => void
}

const NewCardsPrompt = memo(function NewCardsPrompt({
  detection,
  onContinueWithNew,
  onPracticeOnly,
  onBrowseFirst,
  onCancel
}: NewCardsPromptProps) {
  const { analysis, options } = detection

  return createPortal(
    <div className="new-cards-prompt-overlay">
      <div className="new-cards-prompt">
        <div className="new-cards-header">
          <h3>Learning Cards Detected</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <div className="new-cards-analysis">
          <p className="analysis-message">{analysis.message}</p>

          <div className="cards-breakdown">
            <div className="breakdown-item">
              <span className="count">{analysis.newCards}</span>
              <span className="label">Learning cards</span>
            </div>
            <div className="breakdown-item">
              <span className="count">{analysis.practicedCards}</span>
              <span className="label">Practiced cards</span>
            </div>
          </div>

          {analysis.newCardExamples.length > 0 && (
            <div className="card-examples">
              <p className="examples-label">Examples of learning cards:</p>
              <div className="examples-list">
                {analysis.newCardExamples.map((card, index) => (
                  <div key={index} className="example-card">
                    <span className="question">{card.question}</span>
                    <span className="answer">{card.answer}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="new-cards-options">
          <button
            className="btn-primary option-btn"
            onClick={onContinueWithNew}
          >
            {options.continue_with_new.description}
          </button>

          <button
            className="btn-secondary option-btn"
            onClick={onPracticeOnly}
          >
            {options.practice_only.description}
          </button>

          <button
            className="btn-tertiary option-btn"
            onClick={onBrowseFirst}
          >
            {options.browse_first.description}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
})

export default NewCardsPrompt