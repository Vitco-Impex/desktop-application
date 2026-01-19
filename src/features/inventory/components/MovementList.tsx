/**
 * Movement List Component - Main ledger table
 */

import React, { useState, useEffect } from 'react';
import { inventoryService, MovementDocumentResponse, MovementType, MovementStatus } from '@/services/inventory.service';
import { Button, Input, Select } from '@/shared/components/ui';
import { LoadingState, EmptyState } from '@/shared/components/data-display';
import { extractErrorMessage } from '@/utils/error';
import { logger } from '@/shared/utils/logger';
import './MovementList.css';

interface MovementListProps {
  onSelectMovement: (documentId: string) => void;
  selectedDocumentId?: string;
}

export const MovementList: React.FC<MovementListProps> = ({ onSelectMovement, selectedDocumentId }) => {
  const [documents, setDocuments] = useState<MovementDocumentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    movementType: '' as MovementType | '',
    status: '' as MovementStatus | '',
    dateFrom: '',
    dateTo: '',
    createdBy: '',
    myPendingApprovals: false,
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getAllMovementDocuments({
        movementType: filters.movementType || undefined,
        status: filters.status || undefined,
        createdBy: filters.createdBy || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        myPendingApprovals: filters.myPendingApprovals || undefined,
      });
      setDocuments(data);
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to load movements');
      setError(message);
      logger.error('[MovementList] Failed to load movements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [filters]);

  const toggleExpand = (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(documentId)) {
      newExpanded.delete(documentId);
    } else {
      newExpanded.add(documentId);
    }
    setExpandedRows(newExpanded);
  };

  const getFromLocation = (doc: MovementDocumentResponse) => {
    if (doc.lines.length > 0 && doc.lines[0].fromLocation) {
      return doc.lines[0].fromLocation;
    }
    return doc.defaultFromLocation;
  };

  const getToLocation = (doc: MovementDocumentResponse) => {
    if (doc.lines.length > 0 && doc.lines[0].toLocation) {
      return doc.lines[0].toLocation;
    }
    return doc.defaultToLocation;
  };

  if (loading && documents.length === 0) {
    return <LoadingState message="Loading movements..." />;
  }

  if (error && documents.length === 0) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="movement-list">
      <div className="movement-list-toolbar">
        <div className="movement-list-filters">
          <Select
            value={filters.movementType}
            onChange={(e) => setFilters({ ...filters, movementType: e.target.value as MovementType | '' })}
            style={{ width: '200px' }}
          >
            <option value="">All Types</option>
            {Object.values(MovementType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as MovementStatus | '' })}
            style={{ width: '200px' }}
          >
            <option value="">All Statuses</option>
            {Object.values(MovementStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
          <Button
            variant="ghost"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            {showAdvancedFilters ? 'Hide Filters' : 'More Filters'}
          </Button>
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="filter-bar-expanded">
          <div className="filter-row">
            <div className="filter-group">
              <label>Date From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                style={{ width: '150px' }}
              />
            </div>
            <div className="filter-group">
              <label>Date To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                style={{ width: '150px' }}
              />
            </div>
            <div className="filter-group">
              <label>
                <input
                  type="checkbox"
                  checked={filters.myPendingApprovals}
                  onChange={(e) => setFilters({ ...filters, myPendingApprovals: e.target.checked })}
                />
                My Pending Approvals
              </label>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setFilters({
                  movementType: '' as MovementType | '',
                  status: '' as MovementStatus | '',
                  dateFrom: '',
                  dateTo: '',
                  createdBy: '',
                  myPendingApprovals: false,
                });
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {documents.length === 0 ? (
        <EmptyState message="No movements found" />
      ) : (
        <div className="movement-list-table">
          <table>
            <thead>
              <tr>
                <th>Movement #</th>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Total Lines</th>
                <th>From Location</th>
                <th>To Location</th>
                <th>Total Quantity</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Approved By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const isExpanded = expandedRows.has(doc.id);
                const fromLoc = getFromLocation(doc);
                const toLoc = getToLocation(doc);
                return (
                  <React.Fragment key={doc.id}>
                    <tr
                      className={`movement-row ${selectedDocumentId === doc.id ? 'selected' : ''}`}
                      onClick={() => onSelectMovement(doc.id)}
                    >
                      <td>
                        <div className="movement-number-cell">
                          {doc.lines.length > 0 && (
                            <span
                              className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                              onClick={(e) => toggleExpand(doc.id, e)}
                            >
                              ▶
                            </span>
                          )}
                          {doc.movementNumber}
                        </div>
                      </td>
                      <td>{new Date(doc.createdAt).toLocaleString()}</td>
                      <td>{doc.movementType}</td>
                      <td>{doc.totalLines}</td>
                      <td>{fromLoc ? `${fromLoc.code} - ${fromLoc.name}` : '-'}</td>
                      <td>{toLoc ? `${toLoc.code} - ${toLoc.name}` : '-'}</td>
                      <td>{doc.totalQuantity}</td>
                      <td>
                        <span className={`status-${doc.status.toLowerCase()}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td>{doc.createdBy.name}</td>
                      <td>{doc.approvedBy || '-'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectMovement(doc.id)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                    {isExpanded && doc.lines.length > 0 && (
                      <tr>
                        <td colSpan={11} className="expanded-content">
                          <div className="expanded-lines-preview">
                            <strong>Lines Preview:</strong>
                            <table>
                              <thead>
                                <tr>
                                  <th>Line</th>
                                  <th>Item</th>
                                  <th>Variant</th>
                                  <th>From</th>
                                  <th>To</th>
                                  <th>Quantity</th>
                                </tr>
                              </thead>
                              <tbody>
                                {doc.lines.slice(0, 5).map((line) => (
                                  <tr key={line.id}>
                                    <td>{line.lineNo}</td>
                                    <td>{line.item?.name || line.itemId}</td>
                                    <td>{line.variant?.name || '-'}</td>
                                    <td>{line.fromLocation?.code || '-'}</td>
                                    <td>{line.toLocation?.code || '-'}</td>
                                    <td>{line.quantity}</td>
                                  </tr>
                                ))}
                                {doc.lines.length > 5 && (
                                  <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', fontStyle: 'italic' }}>
                                      ... and {doc.lines.length - 5} more lines
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
