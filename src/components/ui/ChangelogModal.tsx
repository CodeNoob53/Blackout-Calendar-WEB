import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation(['ui']);
  const [changelogContent, setChangelogContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const modalRef = useFocusTrap(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.classList.add('modal-open');
      fetchChangelog();
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, onClose]);

  const fetchChangelog = async () => {
    setIsLoading(true);
    try {
      // Визначаємо файл залежно від мови
      const changelogFile = i18n.language === 'uk' ? '/CHANGELOG_UK.md' : '/CHANGELOG.md';
      const response = await fetch(changelogFile);
      const text = await response.text();
      setChangelogContent(text);
    } catch (error) {
      console.error('Failed to load changelog:', error);
      setChangelogContent(i18n.language === 'uk' ? 'Не вдалося завантажити історію змін.' : 'Failed to load changelog.');
    } finally {
      setIsLoading(false);
    }
  };

  const parseChangelog = (markdown: string) => {
    const lines = markdown.split('\n');
    const sections: Array<{
      version: string;
      date: string;
      content: string[];
    }> = [];

    let currentSection: any = null;
    let inSection = false;

    lines.forEach((line) => {
      // Detect version header (e.g., ## [2.2.0] - 2025-12-22)
      const versionMatch = line.match(/^##\s+\[([^\]]+)\]\s+-\s+(.+)/);
      if (versionMatch) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          version: versionMatch[1],
          date: versionMatch[2],
          content: []
        };
        inSection = true;
        return;
      }

      // Detect separator (---)
      if (line.trim() === '---') {
        if (currentSection) {
          sections.push(currentSection);
          currentSection = null;
        }
        inSection = false;
        return;
      }

      // Add content to current section
      if (inSection && currentSection && line.trim()) {
        currentSection.content.push(line);
      }
    });

    // Push last section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  const formatChangelogLine = (line: string) => {
    // Format headers
    if (line.startsWith('### ')) {
      return (
        <h3 className="changelog-section-title" key={line}>
          {line.replace('### ', '')}
        </h3>
      );
    }

    // Format bold sections (e.g., **Title**:)
    if (line.match(/^-\s+\*\*(.+?)\*\*:/)) {
      const match = line.match(/^-\s+\*\*(.+?)\*\*:\s*(.*)$/);
      if (match) {
        return (
          <div className="changelog-item" key={line}>
            <strong>{match[1]}:</strong> {match[2]}
          </div>
        );
      }
    }

    // Format regular list items with sub-items
    if (line.match(/^\s+-\s+/)) {
      const indent = line.match(/^(\s+)/)?.[1].length || 0;
      const content = line.replace(/^\s+-\s+/, '');
      return (
        <div
          className="changelog-subitem"
          key={line}
          style={{ marginLeft: `${indent * 0.5}rem` }}
        >
          • {content}
        </div>
      );
    }

    // Regular paragraphs
    if (line.trim() && !line.startsWith('#')) {
      return (
        <p className="changelog-text" key={line}>
          {line}
        </p>
      );
    }

    return null;
  };

  if (!isOpen) return null;

  const sections = parseChangelog(changelogContent);

  return createPortal(
    <>
      <div className="modal-backdrop" onClick={onClose} />

      <div
        ref={modalRef}
        className="changelog-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
      >
        <div className="changelog-header">
          <div className="changelog-header-content">
            <Package size={24} style={{ color: 'var(--primary-color)' }} />
            <h2 id="changelog-title" className="changelog-title">
              {t('ui:footer.changelog')}
            </h2>
          </div>
          <button onClick={onClose} className="close-btn" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="changelog-body">
          {isLoading ? (
            <div className="changelog-loading">
              <div className="spinner"></div>
              <p>{i18n.language === 'uk' ? 'Завантаження історії змін...' : 'Loading changelog...'}</p>
            </div>
          ) : (
            sections.map((section, index) => (
              <div key={section.version} className="changelog-version-block">
                <div className="changelog-version-header">
                  <span className="changelog-version-badge">v{section.version}</span>
                  <div className="changelog-version-date">
                    <Calendar size={14} />
                    <span>{section.date}</span>
                  </div>
                </div>
                <div className="changelog-version-content">
                  {section.content.map((line, lineIndex) => (
                    <React.Fragment key={lineIndex}>
                      {formatChangelogLine(line)}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

export default ChangelogModal;
