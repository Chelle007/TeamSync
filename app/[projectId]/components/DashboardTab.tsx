"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FileText, Upload, GitBranch, ExternalLink, Calendar, Loader2, X, Check, Pencil, Trash2 } from "lucide-react"
import type { Project } from "@/types/database"
import { toast } from "sonner"

interface DashboardTabProps {
  project: Project | null
  projectDetails: {
    name: string
    description: string
    progress: number
    status: "active" | "completed" | "paused"
    timeline: string
  }
  updates: Array<{ id: string }>
  documents: Array<{ name: string; size: number; created_at: string; url: string }>
  isDeveloperView: boolean
  isLoadingDocuments: boolean
  selectedFile: File | null
  isUploading: boolean
  editingFileName: string | null
  editedFileName: string
  isRenaming: boolean
  isDeleting: string | null
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onUpload: () => void
  onCancelFile: () => void
  onStartRename: (fileName: string) => void
  onCancelRename: () => void
  onSaveRename: (oldFileName: string) => void
  onDelete: (fileName: string) => void
  onSetEditedFileName: (name: string) => void
  getRepoName: (url: string | undefined) => string | null
  formatFileSize: (bytes: number) => string
  formatDate: (dateString: string) => string
}

export function DashboardTab({
  project,
  projectDetails,
  updates,
  documents,
  isDeveloperView,
  isLoadingDocuments,
  selectedFile,
  isUploading,
  editingFileName,
  editedFileName,
  isRenaming,
  isDeleting,
  onFileSelect,
  onUpload,
  onCancelFile,
  onStartRename,
  onCancelRename,
  onSaveRename,
  onDelete,
  onSetEditedFileName,
  getRepoName,
  formatFileSize,
  formatDate,
}: DashboardTabProps) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-4 flex-1">
          <h2 className="text-4xl font-bold">
            {projectDetails.name}
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl leading-relaxed">
            {projectDetails.description}
          </p>
          {project?.github_url && (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="default" asChild className="h-10 px-4">
                <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  <span className="font-medium">{getRepoName(project.github_url) || "View Repository"}</span>
                  <ExternalLink className="h-4 w-4 opacity-60" />
                </a>
              </Button>
              {project?.live_url && (
                <Button variant="outline" size="default" asChild className="h-10">
                  <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    <span>Live Site</span>
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Stats Card */}
        <Card className="bg-gradient-to-br from-card to-card/80 border-2 shadow-lg w-full lg:w-96">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Progress</span>
              <span className="text-2xl font-bold">{projectDetails.progress}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-500 shadow-sm"
                style={{ width: `${projectDetails.progress}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Updates</p>
                <p className="text-lg font-semibold">{updates.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className="text-lg font-semibold capitalize">{projectDetails.status}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Calendar className="h-3 w-3" />
              <span>{projectDetails.timeline}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6">
        {/* Project Files */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Project Files</h3>
              </div>
              {isDeveloperView && (
                <div className="flex items-center gap-3">
                  <input
                    id="file-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={onFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="file-upload">
                    <Button
                      variant="default"
                      size="default"
                      asChild
                      className="cursor-pointer h-10 px-4 shadow-sm hover:shadow-md transition-shadow hover:translate-y-0"
                    >
                      <span className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload PDF
                      </span>
                    </Button>
                  </label>
                  {selectedFile && (
                    <Button
                      size="default"
                      onClick={onUpload}
                      disabled={isUploading}
                      className="h-10 px-4"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        "Confirm Upload"
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(selectedFile.size)})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancelFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {isLoadingDocuments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {isDeveloperView 
                    ? "No files uploaded yet. Upload a PDF to get started." 
                    : "No files available for this project."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.name}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {editingFileName === doc.name ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editedFileName}
                              onChange={(e) => onSetEditedFileName(e.target.value)}
                              className="h-8 text-sm"
                              disabled={isRenaming}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") onSaveRename(doc.name)
                                if (e.key === "Escape") onCancelRename()
                              }}
                            />
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 px-2"
                              onClick={() => onSaveRename(doc.name)}
                              disabled={isRenaming}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={onCancelRename}
                              disabled={isRenaming}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                        )}
                        {editingFileName !== doc.name && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>{formatFileSize(doc.size)}</span>
                            <span>•</span>
                            <span>{formatDate(doc.created_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {editingFileName !== doc.name && (
                      <div className="flex items-center gap-2">
                        {isDeveloperView && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onStartRename(doc.name)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(doc.name)}
                              disabled={isDeleting === doc.name}
                              className="h-8 w-8 p-0 hover:text-destructive"
                            >
                              {isDeleting === doc.name ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-8 w-8 p-0"
                        >
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
