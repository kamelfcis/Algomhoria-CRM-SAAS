'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Filter, CheckSquare, Square, Download } from 'lucide-react'
import { useTranslations } from '@/hooks/use-translations'
import { cn } from '@/lib/utils'
import { exportToCSV, ExportColumn } from '@/lib/utils/export'

type SortDirection = 'asc' | 'desc' | null

interface FilterOption {
  key: string
  label: string
  type?: 'select' | 'text' | 'date'
  options?: { value: string; label: string }[]
}

interface BulkAction {
  label: string
  action: (selectedIds: string[]) => void | Promise<void>
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  icon?: React.ReactNode
  disabled?: boolean
}

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (value: any, row: T) => React.ReactNode
  sortable?: boolean
  filterable?: boolean
  filterType?: 'select' | 'text' | 'date'
  filterOptions?: { value: string; label: string }[]
}

interface DataTableProps<T extends Record<string, any>> {
  data: T[] | undefined
  columns: Column<T>[]
  isLoading?: boolean
  searchKey?: keyof T | (keyof T)[]
  searchPlaceholder?: string
  filters?: FilterOption[]
  onRowClick?: (row: T) => void
  actions?: (row: T) => React.ReactNode
  itemsPerPage?: number
  enableSelection?: boolean
  getRowId?: (row: T) => string
  bulkActions?: BulkAction[]
  enableExport?: boolean
  exportFilename?: string
  exportColumns?: ExportColumn[]
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  searchKey,
  searchPlaceholder,
  filters,
  onRowClick,
  actions,
  itemsPerPage = 10,
  enableSelection = false,
  getRowId = (row: T) => row.id,
  bulkActions = [],
  enableExport = false,
  exportFilename = 'export',
  exportColumns,
}: DataTableProps<T>) {
  const t = useTranslations()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  // Helper function to get nested property value
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, prop) => current?.[prop], obj)
  }

  // Filter data based on search
  const filteredBySearch = useMemo(() => {
    if (!searchQuery || !searchKey) return data || []
    
    const searchKeys = Array.isArray(searchKey) ? searchKey : [searchKey]
    
    return (data || []).filter((item) => {
      return searchKeys.some((key) => {
        const value = typeof key === 'string' && key.includes('.') 
          ? getNestedValue(item, key)
          : item[key]
        return value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
      })
    })
  }, [data, searchQuery, searchKey])

  // Filter data based on active filters
  const filteredByFilters = useMemo(() => {
    if (Object.keys(activeFilters).length === 0) return filteredBySearch
    
    return filteredBySearch.filter((item) => {
      return Object.entries(activeFilters).every(([key, value]) => {
        if (!value || value === 'all') return true
        const itemValue = item[key]
        // Handle "none" filter for null/undefined values
        if (value === 'none') {
          return itemValue === null || itemValue === undefined || itemValue === ''
        }
        return itemValue?.toString() === value || itemValue?.toString().toLowerCase().includes(value.toLowerCase())
      })
    })
  }, [filteredBySearch, activeFilters])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredByFilters
    
    return [...filteredByFilters].sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return 1
      if (bValue == null) return -1
      
      // Handle different types
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime()
      }
      
      // String comparison
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      
      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0
      }
    })
  }, [filteredByFilters, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = sortedData.slice(startIndex, endIndex)

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => {
      if (!value || value === 'all') {
        const newFilters = { ...prev }
        delete newFilters[key]
        return newFilters
      }
      return { ...prev, [key]: value }
    })
    setCurrentPage(1)
  }

  const clearFilter = (key: string) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
    setCurrentPage(1)
  }

  const clearAllFilters = () => {
    setActiveFilters({})
    setSearchQuery('')
    setSortColumn(null)
    setSortDirection(null)
    setCurrentPage(1)
  }

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1" />
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="h-4 w-4 ml-1" />
    }
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
  }

  // Selection handlers
  const toggleRowSelection = (rowId: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(rowId)) {
        newSet.delete(rowId)
      } else {
        newSet.add(rowId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set())
    } else {
      const allIds = new Set(paginatedData.map((row) => getRowId(row)))
      setSelectedRows(allIds)
    }
  }

  const clearSelection = () => {
    setSelectedRows(new Set())
  }

  const isAllSelected = paginatedData.length > 0 && selectedRows.size === paginatedData.length
  const isSomeSelected = selectedRows.size > 0 && selectedRows.size < paginatedData.length

  const activeFiltersCount = Object.keys(activeFilters).length + (searchQuery ? 1 : 0) + (sortColumn ? 1 : 0)

  // Export handler
  const handleExport = () => {
    if (!sortedData || sortedData.length === 0) {
      alert(t('common.noDataToExport') || 'No data to export')
      return
    }

    // Use exportColumns if provided, otherwise convert table columns
    const cols: ExportColumn[] = exportColumns || columns.map((col) => ({
      key: String(col.key),
      header: col.header,
      accessor: (row: T) => {
        const value = row[col.key as keyof T]
        return col.render ? String(value ?? '') : value
      },
    }))

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `${exportFilename}-${timestamp}.csv`
    
    exportToCSV(sortedData, cols, filename)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 items-center w-full sm:w-auto">
          {searchKey && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder || t('common.search')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10"
              />
            </div>
          )}
          
          {(filters && filters.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              {t('common.filter') || 'Filter'}
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          )}
        </div>

        <div className="flex gap-2 items-center">
          {enableExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {t('common.export') || 'Export CSV'}
            </Button>
          )}

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              {t('common.clearFilters') || 'Clear All'}
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {enableSelection && selectedRows.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedRows.size} {t('common.selected') || 'selected'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-7 text-xs"
            >
              {t('common.clearSelection') || 'Clear'}
            </Button>
          </div>
          <div className="flex gap-2">
            {bulkActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={() => {
                  const selectedIds = Array.from(selectedRows)
                  action.action(selectedIds)
                  clearSelection()
                }}
                disabled={action.disabled}
                className="gap-2"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && filters && filters.length > 0 && (
        <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => {
              const column = columns.find((col) => col.key === filter.key)
              const filterType = filter.type || column?.filterType || 'text'
              const filterOptions = filter.options || column?.filterOptions || []

              if (filterType === 'select' && filterOptions.length > 0) {
                return (
                  <div key={filter.key} className="space-y-2">
                    <label className="text-sm font-medium">{filter.label}</label>
                    <Select
                      value={activeFilters[filter.key] || 'all'}
                      onValueChange={(value) => handleFilterChange(filter.key, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                        {filterOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              return (
                <div key={filter.key} className="space-y-2">
                  <label className="text-sm font-medium">{filter.label}</label>
                  <Input
                    placeholder={t('common.search') || 'Search...'}
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
              <span>{t('common.search')}: "{searchQuery}"</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-primary/20"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          {Object.entries(activeFilters).map(([key, value]) => {
            const filter = filters?.find((f) => f.key === key)
            const column = columns.find((col) => col.key === key)
            const label = filter?.label || column?.header || key
            
            return (
              <div
                key={key}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
              >
                <span>{label}: {value}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-primary/20"
                  onClick={() => clearFilter(key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )
          })}
          {sortColumn && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
              <span>
                {t('common.sortedBy') || 'Sorted by'}: {columns.find((c) => c.key === sortColumn)?.header || sortColumn} ({sortDirection === 'asc' ? '↑' : '↓'})
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-primary/20"
                onClick={() => {
                  setSortColumn(null)
                  setSortDirection(null)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {enableSelection && (
                <TableHead className="w-12">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={toggleSelectAll}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : isSomeSelected ? (
                      <div className="h-4 w-4 border-2 border-primary rounded" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={cn(
                    column.sortable && 'cursor-pointer hover:bg-muted/50',
                    'select-none'
                  )}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable && getSortIcon(String(column.key))}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead className="w-[100px]">{t('common.actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0) + (enableSelection ? 1 : 0)}
                  className="h-24 text-center"
                >
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => {
                const rowId = getRowId(row)
                const isSelected = selectedRows.has(rowId)
                return (
                  <TableRow
                    key={index}
                    onClick={() => !enableSelection && onRowClick?.(row)}
                    className={cn(
                      onRowClick && !enableSelection ? 'cursor-pointer' : '',
                      isSelected && 'bg-muted/50'
                    )}
                  >
                    {enableSelection && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleRowSelection(rowId)}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                    {columns.map((column) => {
                      const value = row[column.key as keyof T]
                      return (
                        <TableCell key={String(column.key)}>
                          {column.render ? column.render(value, row) : String(value ?? '')}
                        </TableCell>
                      )
                    })}
                    {actions && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {actions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {sortedData.length > 0 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {t('common.showing')} {startIndex + 1} - {Math.min(endIndex, sortedData.length)} {t('common.of')} {sortedData.length}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm">
                {t('common.page')} {currentPage} {t('common.of')} {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
