import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ZegoCloud from './ZegoCloud'
import Viedo_Room from './Viedo_Room'

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/"         element={<ZegoCloud />} />
      <Route path="/room/:id" element={<Viedo_Room />} />
    </Routes>
  </BrowserRouter>
)

export default App
