import React from 'react';
import { useAppStore, ProjectSummaryReport } from '@/stores/appStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

interface ProjectSummaryReportProps {
  onExport?: () => void;
}

export const ProjectSummaryReportDialog: React.FC<ProjectSummaryReportProps> = ({ onExport }) => {
  const {
    projectSummaryReport,
    isReportDialogOpen,
    setIsReportDialogOpen,
    isGeneratingReport,
    getSelectedProject,
  } = useAppStore();

  const selectedProject = getSelectedProject();

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      // Default export functionality - create and download as HTML
      if (!projectSummaryReport) return;
      
      const reportHtml = generateReportHtml(projectSummaryReport, selectedProject?.name || 'Project');
      
      const blob = new Blob([reportHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedProject?.name || 'project'}-summary-report.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!projectSummaryReport && !isGeneratingReport) {
    return null;
  }

  return (
    <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {selectedProject?.emoji && `${selectedProject.emoji} `}
            {selectedProject?.name || 'Project'} Summary Report
          </DialogTitle>
          <DialogDescription>
            A comprehensive summary of all discussions in this project
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {isGeneratingReport ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-center text-muted-foreground">
              Generating comprehensive report from all threads...
              <br />
              This may take a moment.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-grow h-full overflow-auto" style={{ height: 'calc(90vh - 200px)' }}>
            {projectSummaryReport && (
              <div className="space-y-8 mr-6">
                {/* Summary of Perspectives Section */}
                <section>
                  <h2 className="text-2xl font-bold mb-4">Summary of Perspectives</h2>
                  
                  {projectSummaryReport.perspectives_summary.sections.map((section, idx) => (
                    <Card key={idx} className="mb-4">
                      <CardHeader>
                        <CardTitle>{section.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {section.points.map((point, pointIdx) => (
                            <li key={pointIdx} className="flex gap-2">
                              <div>
                                <Badge variant="outline" className="mr-2">
                                  {point.agent}
                                </Badge>
                                {point.agent_role && (
                                  <span className="text-xs text-muted-foreground">
                                    {point.agent_role}
                                  </span>
                                )}
                              </div>
                              <p>{point.point}</p>
                            </li>
                          ))}
                        </ul>

                        {section.relevant_literature && section.relevant_literature.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Relevant Literature:</h4>
                            <ul className="space-y-1">
                              {section.relevant_literature.map((lit, litIdx) => (
                                <li key={litIdx} className="text-sm flex items-center">
                                  <a
                                    href={lit.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center"
                                  >
                                    {lit.title}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </section>

                <Separator />

                {/* Potential Research Ideas Section */}
                <section>
                  <h2 className="text-2xl font-bold mb-4">Potential Research Ideas</h2>

                  {/* Motivation */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="text-xl">Motivation:</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc pl-10 space-y-2">
                        {projectSummaryReport.research_proposal.motivation.map((item, idx) => (
                          <li key={idx}>{item.point}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Related Works */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="text-xl">Related Works:</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {projectSummaryReport.research_proposal.related_works.map((category, catIdx) => (
                        <div key={catIdx} className="mb-4 pl-5">
                          <h4 className="text-lg font-medium mb-2">{category.category}:</h4>
                          <ul className="space-y-3">
                            {category.works.map((work, workIdx) => (
                              <li key={workIdx} className="pl-4 border-l-2 border-muted-foreground/30">
                                <div className="font-medium">
                                  {work.url ? (
                                    <a
                                      href={work.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline flex items-center"
                                    >
                                      {work.title}
                                      <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                  ) : (
                                    work.title
                                  )}
                                </div>
                                <p className="text-muted-foreground text-sm">{work.description}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Method */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="text-xl">Method:</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {projectSummaryReport.research_proposal.method.map((method, methodIdx) => (
                        <div key={methodIdx} className="mb-3 pl-5">
                          <h4 className="text-lg font-medium">{method.title}:</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {method.points.map((point, pointIdx) => (
                              <li key={pointIdx}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Potential Outcomes */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="text-xl">Potential Outcomes:</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="pl-10">
                          <ul className="list-disc space-y-2">
                          {projectSummaryReport.research_proposal.potential_outcomes.map((outcome, idx) => (
                              <li key={idx}>{outcome}</li>
                          ))}
                          </ul>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              </div>
            )}
          </ScrollArea>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
            Close
          </Button>
          <Button
            onClick={handleExport}
            disabled={isGeneratingReport || !projectSummaryReport}
          >
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to generate HTML report for export
function generateReportHtml(report: ProjectSummaryReport, projectName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${projectName} - Research Summary Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        h1, h2, h3, h4 {
          color: #111;
          margin-top: 1.5em;
        }
        h1 { font-size: 2em; }
        h2 { font-size: 1.6em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
        h3 { font-size: 1.3em; }
        h4 { font-size: 1.1em; }
        .agent-badge {
          display: inline-block;
          background-color: #f0f0f0;
          border-radius: 4px;
          padding: 2px 8px;
          font-size: 0.85em;
          font-weight: 500;
          margin-right: 8px;
        }
        .agent-role {
          font-size: 0.8em;
          color: #666;
        }
        ul {
          padding-left: 25px;
        }
        li {
          margin-bottom: 8px;
        }
        .card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          background-color: #fff;
        }
        .card-title {
          font-size: 1.2em;
          font-weight: bold;
          margin-top: 0;
          margin-bottom: 12px;
        }
        a {
          color: #0366d6;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .item {
          border-left: 2px solid #ddd;
          padding-left: 12px;
          margin: 12px 0;
        }
        .separator {
          height: 1px;
          background-color: #eee;
          margin: 30px 0;
        }
      </style>
    </head>
    <body>
      <h1>${projectName} - Research Summary Report</h1>
      
      <h2>Summary of Perspectives</h2>
      ${report.perspectives_summary.sections.map(section => `
        <div class="card">
          <h3 class="card-title">${section.title}</h3>
          <ul>
            ${section.points.map(point => `
              <li>
                <span class="agent-badge">${point.agent}</span>
                ${point.agent_role ? `<span class="agent-role">${point.agent_role}</span>` : ''}
                ${point.point}
              </li>
            `).join('')}
          </ul>
          ${section.relevant_literature && section.relevant_literature.length > 0 ? `
            <h4>Relevant Literature:</h4>
            <ul>
              ${section.relevant_literature.map(lit => `
                <li><a href="${lit.url}" target="_blank">${lit.title}</a></li>
              `).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
      
      <div class="separator"></div>
      
      <h2>Potential Research Ideas</h2>
      
      <h3>Motivation</h3>
      <ul>
        ${report.research_proposal.motivation.map(item => `
          <li>${item.point}</li>
        `).join('')}
      </ul>
      
      <h3>Related Works</h3>
      ${report.research_proposal.related_works.map(category => `
        <h4>${category.category}</h4>
        <div>
          ${category.works.map(work => `
            <div class="item">
              <div><strong>${work.url ? `<a href="${work.url}" target="_blank">${work.title}</a>` : work.title}</strong></div>
              <div>${work.description}</div>
            </div>
          `).join('')}
        </div>
      `).join('')}
      
      <h3>Method</h3>
      ${report.research_proposal.method.map(method => `
        <h4>${method.title}</h4>
        <ul>
          ${method.points.map(point => `
            <li>${point}</li>
          `).join('')}
        </ul>
      `).join('')}
      
      <h3>Potential Outcomes</h3>
      <ul>
        ${report.research_proposal.potential_outcomes.map(outcome => `
          <li>${outcome}</li>
        `).join('')}
      </ul>
    </body>
    </html>
  `;
} 