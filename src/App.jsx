import { Suspense, lazy, useState } from 'react';
import Toolbar from './components/Toolbar';
import FurniturePalette from './components/FurniturePalette';
import CanvasEditor from './components/CanvasEditor';
import PropertiesPanel from './components/PropertiesPanel';

// three.js is only needed for the bonus 3D preview, so keep it out of the main bundle.
const Preview3D = lazy(() => import('./components/Preview3D'));

function App() {
  const [show3D, setShow3D] = useState(false);

  return (
    <div className="app">
      <Toolbar onOpen3D={() => setShow3D(true)} />
      <div className="app-body">
        <FurniturePalette />
        <CanvasEditor />
        <PropertiesPanel />
      </div>
      {show3D && (
        <Suspense fallback={null}>
          <Preview3D onClose={() => setShow3D(false)} />
        </Suspense>
      )}
    </div>
  );
}

export default App;
