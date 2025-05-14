import { PointsModel } from "../../models/points";

interface PointsLayerConfigsPanelProps {
  pointsId: string;
  points: PointsModel;
}

export default function PointsLayerConfigsPanel(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _props: PointsLayerConfigsPanelProps,
) {
  return <></>;
  // const activeSettings = points.settings.get(points.activeSettingsId);
  // const setActiveSettings = useSharedStore(
  //   (state) => state.setActivePointsSettings,
  // );
  // return (
  //   <div>
  //     <Form.Select
  //       value={points.activeSettingsId}
  //       onChange={(e) => setActiveSettings(pointsId, e.target.value)}
  //     >
  //       {MapUtils.map(points.settings, (settingsId, settings) => (
  //         <option key={settingsId} value={settingsId}>
  //           {settings.name}
  //         </option>
  //       ))}
  //     </Form.Select>
  //     {activeSettings && (
  //       <div>
  //         <legend>Size</legend>
  //         <input
  //           id="sizeValue"
  //           type="radio"
  //           checked={
  //             !isPointValuesVariable(activeSettings.size) &&
  //             !isPointGroupsVariable(activeSettings.size)
  //           }
  //         />
  //         <label htmlFor="sizeValue">Value:</label>
  //         <input type="number" value={activeSettings.size as number} readOnly />
  //         <input
  //           id="sizeValuesVariable"
  //           type="radio"
  //           checked={isPointValuesVariable(activeSettings.size)}
  //           readOnly
  //         />
  //         <label htmlFor="sizeValuesVariable">From data:</label>
  //         {/* FIXME */}
  //         <input
  //           id="sizeGroupsVariable"
  //           type="radio"
  //           checked={isPointGroupsVariable(activeSettings.size)}
  //           readOnly
  //         />
  //         <label htmlFor="sizeGroupsVariable">By group:</label>
  //         {/* FIXME */}
  //       </div>
  //     )}
  //   </div>
  // );
}
