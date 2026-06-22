import { useEffect, useState } from "react"

import { Users } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { useAppStore } from "@/stores/appStore"

import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { LRTableColumnData } from "@/types"

export default function LRTable({ axis }: { axis: "paper" | "persona" }) {
  const { LRTableData, personas, selectedPersonaId, getSelectedPersona, tableOfContents } = useAppStore()

  const getAvatarFromPersonaName = (personaName: string) => {
    const persona = personas.find((p) => p.name === personaName)
    return persona?.avatar
  }

  const sortedColumns = Object.entries(LRTableData?.scheme || {}).sort(([aspectA, columnDataA], [aspectB, columnDataB]) => {
    const isSelectedA = (columnDataA as LRTableColumnData).persona === getSelectedPersona()?.name
    const isSelectedB = (columnDataB as LRTableColumnData).persona === getSelectedPersona()?.name
    return Number(isSelectedB) - Number(isSelectedA)
  })

  return (
    <TooltipProvider>
      {axis === "paper" && (
        <Table>
          <TableHeader>
          <TableRow>
            <TableHead className="min-w-24 text-center">Paper ID</TableHead>
            {sortedColumns.map(([aspect, columnData]) => (
              (columnData as LRTableColumnData).column_names.map((columnName) => (
                <TableHead className="min-w-48">
                  <div className="h-full flex flex-row items-center justify-between gap-2">
                    {columnName}
                    {(columnData as LRTableColumnData).persona === "common" && (
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger>
                          <Users size={16} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <span>All experts agree on this</span>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {(columnData as LRTableColumnData).persona !== "common" && (
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger>
                          <img src={getAvatarFromPersonaName((columnData as LRTableColumnData).persona)} alt="Persona Avatar" className="w-6 h-6 rounded-full max-w-none" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <span>Perspective from {columnData.persona}</span>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableHead>
              ))
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(LRTableData?.table_values || {}).map(([index, rowData]) => (
            <TableRow key={index}>
              <TableCell className="text-center">{index}</TableCell>
              {sortedColumns.map(([aspect, columnData]) => (
                (columnData as LRTableColumnData).column_names.map((columnName) => (
                  <TableCell className="font-medium">
                    {rowData[columnName]?.gist || ''}
                  </TableCell>
                ))
              ))}
            </TableRow>
          ))}
          </TableBody>
        </Table>
      )}
      {axis === "persona" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-24 text-center">Expert</TableHead>
              {tableOfContents?.table_of_contents.map((topic) => (
                <TableHead key={topic.topic} className="min-w-48 text-center">{topic.topic}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {personas.map((persona) => (
              <TableRow key={persona.id}>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <img
                      src={getAvatarFromPersonaName(persona.name)}
                      alt={`${persona.name} Avatar`}
                      className="w-8 h-8 rounded-full"
                    />
                    {/* {persona.name} */}
                  </div>
                </TableCell>
                {tableOfContents?.table_of_contents.map((topic) => (
                  <TableCell key={topic.topic} className="text-center">
                    {tableOfContents?.table_of_contents.find(
                      (t) => t.topic === topic.topic
                    )?.perspectives.find(
                      (p) => p.persona_id.replace(/_/g, ' ').toLowerCase() === persona.id.replace(/_/g, ' ').toLowerCase()
                    )?.perspective || ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TooltipProvider>
  )
}