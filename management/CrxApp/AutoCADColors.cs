using System;
using System.Runtime.InteropServices;

namespace JigsawGenerator
{
  class AutoCADColors
  {
    public struct AcColorSettings
    {
      public UInt32 dwGfxModelBkColor;
      public UInt32 dwGfxLayoutBkColor;
      public UInt32 dwParallelBkColor;
      public UInt32 dwBEditBkColor;
      public UInt32 dwCmdLineBkColor;
      public UInt32 dwPlotPrevBkColor;
      public UInt32 dwSkyGradientZenithColor;
      public UInt32 dwSkyGradientHorizonColor;
      public UInt32 dwGroundGradientOriginColor;
      public UInt32 dwGroundGradientHorizonColor;
      public UInt32 dwEarthGradientAzimuthColor;
      public UInt32 dwEarthGradientHorizonColor;
      public UInt32 dwModelCrossHairColor;
      public UInt32 dwLayoutCrossHairColor;
      public UInt32 dwParallelCrossHairColor;
      public UInt32 dwPerspectiveCrossHairColor;
      public UInt32 dwBEditCrossHairColor;
      public UInt32 dwParallelGridMajorLines;
      public UInt32 dwPerspectiveGridMajorLines;
      public UInt32 dwParallelGridMinorLines;
      public UInt32 dwPerspectiveGridMinorLines;
      public UInt32 dwParallelGridAxisLines;
      public UInt32 dwPerspectiveGridAxisLines;
      public UInt32 dwTextForeColor;
      public UInt32 dwTextBkColor;
      public UInt32 dwCmdLineForeColor;
      public UInt32 dwAutoTrackingVecColor;
      public UInt32 dwLayoutATrackVecColor;
      public UInt32 dwParallelATrackVecColor;
      public UInt32 dwPerspectiveATrackVecColor;
      public UInt32 dwBEditATrackVecColor;
      public UInt32 dwModelASnapMarkerColor;
      public UInt32 dwLayoutASnapMarkerColor;
      public UInt32 dwParallelASnapMarkerColor;
      public UInt32 dwPerspectiveASnapMarkerColor;
      public UInt32 dwBEditASnapMarkerColor;
      public UInt32 dwModelDftingTooltipColor;
      public UInt32 dwLayoutDftingTooltipColor;
      public UInt32 dwParallelDftingTooltipColor;
      public UInt32 dwPerspectiveDftingTooltipColor;
      public UInt32 dwBEditDftingTooltipColor;
      public UInt32 dwModelDftingTooltipBkColor;
      public UInt32 dwLayoutDftingTooltipBkColor;
      public UInt32 dwParallelDftingTooltipBkColor;
      public UInt32 dwPerspectiveDftingTooltipBkColor;
      public UInt32 dwBEditDftingTooltipBkColor;
      public UInt32 dwModelLightGlyphs;
      public UInt32 dwLayoutLightGlyphs;
      public UInt32 dwParallelLightGlyphs;
      public UInt32 dwPerspectiveLightGlyphs;
      public UInt32 dwBEditLightGlyphs;
      public UInt32 dwModelLightHotspot;
      public UInt32 dwLayoutLightHotspot;
      public UInt32 dwParallelLightHotspot;
      public UInt32 dwPerspectiveLightHotspot;
      public UInt32 dwBEditLightHotspot;
      public UInt32 dwModelLightFalloff;
      public UInt32 dwLayoutLightFalloff;
      public UInt32 dwParallelLightFalloff;
      public UInt32 dwPerspectiveLightFalloff;
      public UInt32 dwBEditLightFalloff;
      public UInt32 dwModelLightStartLimit;
      public UInt32 dwLayoutLightStartLimit;
      public UInt32 dwParallelLightStartLimit;
      public UInt32 dwPerspectiveLightStartLimit;
      public UInt32 dwBEditLightStartLimit;
      public UInt32 dwModelLightEndLimit;
      public UInt32 dwLayoutLightEndLimit;
      public UInt32 dwParallelLightEndLimit;
      public UInt32 dwPerspectiveLightEndLimit;
      public UInt32 dwBEditLightEndLimit;
      public UInt32 dwModelCameraGlyphs;
      public UInt32 dwLayoutCameraGlyphs;
      public UInt32 dwParallelCameraGlyphs;
      public UInt32 dwPerspectiveCameraGlyphs;
      public UInt32 dwModelCameraFrustrum;
      public UInt32 dwLayoutCameraFrustrum;
      public UInt32 dwParallelCameraFrustrum;
      public UInt32 dwPerspectiveCameraFrustrum;
      public UInt32 dwModelCameraClipping;
      public UInt32 dwLayoutCameraClipping;
      public UInt32 dwParallelCameraClipping;
      public UInt32 dwPerspectiveCameraClipping;
      public int nModelCrosshairUseTintXYZ;
      public int nLayoutCrosshairUseTintXYZ;
      public int nParallelCrosshairUseTintXYZ;
      public int nPerspectiveCrosshairUseTintXYZ;
      public int nBEditCrossHairUseTintXYZ;
      public int nModelATrackVecUseTintXYZ;
      public int nLayoutATrackVecUseTintXYZ;
      public int nParallelATrackVecUseTintXYZ;
      public int nPerspectiveATrackVecUseTintXYZ;
      public int nBEditATrackVecUseTintXYZ;
      public int nModelDftingTooltipBkUseTintXYZ;
      public int nLayoutDftingTooltipBkUseTintXYZ;
      public int nParallelDftingTooltipBkUseTintXYZ;
      public int nPerspectiveDftingTooltipBkUseTintXYZ;
      public int nBEditDftingTooltipBkUseTintXYZ;
      public int nParallelGridMajorLineTintXYZ;
      public int nPerspectiveGridMajorLineTintXYZ;
      public int nParallelGridMinorLineTintXYZ;
      public int nPerspectiveGridMinorLineTintXYZ;
      public int nParallelGridAxisLineTintXYZ;
      public int nPerspectiveGridAxisLineTintXYZ;
    };

    // To access the colours in AutoCAD, we need ObjectARX...

    [DllImport("accore.dll",
    CallingConvention = CallingConvention.Cdecl,
    EntryPoint = "?acedGetCurrentColors@@YAHPEAUAcColorSettings@@@Z"
    )]
    static extern bool acedGetCurrentColors(
      out AcColorSettings colorSettings
    );

    [DllImport("accore.dll",
    CallingConvention = CallingConvention.Cdecl,
    EntryPoint = "?acedSetCurrentColors@@YAHPEAUAcColorSettings@@@Z"
    )]
    static extern bool acedSetCurrentColors(
      ref AcColorSettings colorSettings
    );

    public static AcColorSettings GetCurrentColors()
    {
      var cs = new AcColorSettings();
      acedGetCurrentColors(out cs);
      return cs;
    }

    public static void SetCurrentColors(AcColorSettings cs)
    {
      acedSetCurrentColors(ref cs);
    }
  }
}
