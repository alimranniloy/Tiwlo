import React from 'react';
import ControlRecordComposer from './ControlRecordComposer';
import PageCommands from './workspace/PageCommands';
import WorkspaceToolbar from './workspace/WorkspaceToolbar';
import ZoneRenderer from './workspace/WorkspaceZones';
import { buildWorkspaceData, filterRecords, type ModuleWorkspaceProps, type WorkspaceFilter } from './workspace/shared';

const defaultFilter: WorkspaceFilter = {
  query: '',
  status: '',
  scope: 'all',
  includeMetadata: true
};

export default function ModuleWorkspace(props: ModuleWorkspaceProps) {
  const { section, workspace, composerOpen, saving, editingRecord, onCloseComposer, onSaveRecord } = props;
  const [filter, setFilter] = React.useState<WorkspaceFilter>(defaultFilter);

  React.useEffect(() => {
    setFilter(defaultFilter);
  }, [section.key]);

  const filteredRecords = React.useMemo(() => filterRecords(section.records, filter), [section.records, filter]);
  const filteredSection = React.useMemo(() => ({ ...section, records: filteredRecords }), [section, filteredRecords]);
  const data = React.useMemo(() => buildWorkspaceData(filteredSection), [filteredSection]);

  const filteredProps: ModuleWorkspaceProps = {
    ...props,
    section: filteredSection
  };

  return (
    <div className="space-y-4">
      <WorkspaceToolbar
        workspace={workspace}
        sectionKey={section.key}
        records={section.records}
        filteredCount={filteredRecords.length}
        filter={filter}
        onFilterChange={setFilter}
      />

      <PageCommands {...props} />

      <ControlRecordComposer
        open={composerOpen}
        saving={saving}
        sectionKey={section.key}
        sectionLabel={section.label}
        noun={workspace.primaryNoun}
        record={editingRecord}
        onClose={onCloseComposer}
        onSave={onSaveRecord}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {workspace.zones.map((zone) => (
          <div key={`${zone.kind}-${zone.title}`} className={zone.span === 'full' ? 'xl:col-span-12' : zone.span === 'side' ? 'xl:col-span-4' : 'xl:col-span-8'}>
            <ZoneRenderer {...filteredProps} zone={zone} data={data} />
          </div>
        ))}
      </div>
    </div>
  );
}
