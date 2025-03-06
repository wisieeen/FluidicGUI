import { useButtonColorScheme } from '../context/ColorSchemeContext';

// Get button colors based on the selected color scheme
export const useButtonColors = () => {
  const { buttonColorScheme } = useButtonColorScheme();
  
  // Default color values
  const defaultColors = {
    primary: {
      base: '#4CAF50',
      hover: '#45a049'
    },
    secondary: {
      base: '#2196F3',
      hover: '#1976D2'
    },
    danger: {
      base: '#f44336',
      hover: '#d32f2f'
    },
    warning: {
      base: '#ff9800',
      hover: '#f57c00'
    },
    info: {
      base: '#00bcd4',
      hover: '#00acc1'
    }
  };
  
  // Color schemes for buttons
  const colorSchemes = {
    viridis: {
      primary: {
        base: '#33A077', // greenish teal from viridis
        hover: '#2D8A69'
      },
      secondary: {
        base: '#472D7B', // deep purple from viridis
        hover: '#3B2565'
      },
      info: {
        base: '#29AF7F', // another teal from viridis
        hover: '#229169'
      },
      warning: {
        base: '#95D840', // lime green from viridis
        hover: '#7FB636'
      },
      danger: {
        base: '#FDE725', // yellow from viridis
        hover: '#D6C321'
      }
    },
    plasma: {
      primary: {
        base: '#952E98', // violet from plasma
        hover: '#7F2682'
      },
      secondary: {
        base: '#470B6C', // deep purple from plasma
        hover: '#3C095A'
      },
      info: {
        base: '#E06FC0', // pink from plasma
        hover: '#C65DAA'
      },
      warning: {
        base: '#F7B53B', // orange from plasma
        hover: '#D19932'
      },
      danger: {
        base: '#FDB92E', // yellow-orange from plasma
        hover: '#D99B26'
      }
    },
    inferno: {
      primary: {
        base: '#BB3754', // red-burgundy from inferno
        hover: '#9F2F47'
      },
      secondary: {
        base: '#781C6D', // deep purple from inferno
        hover: '#65175B'
      },
      info: {
        base: '#54CB35', // green from inferno
        hover: '#47AE2D'
      },
      warning: {
        base: '#F57D15', // orange from inferno
        hover: '#D06A12'
      },
      danger: {
        base: '#FCFFA4', // bright yellow from inferno
        hover: '#D9D98C'
      }
    },
    cividis: {
      primary: {
        base: '#61B8A9', // teal from cividis
        hover: '#529D90'
      },
      secondary: {
        base: '#1E4F80', // deep blue from cividis
        hover: '#19426D'
      },
      info: {
        base: '#86C4A5', // blue-green from cividis
        hover: '#72A68C'
      },
      warning: {
        base: '#CFD88A', // lime green from cividis
        hover: '#B0B875'
      },
      danger: {
        base: '#FFF00E', // yellow from cividis
        hover: '#D9CC0C'
      }
    },
    turbo: {
      primary: {
        base: '#30A4CA', // bright blue from turbo
        hover: '#288AAB'
      },
      secondary: {
        base: '#3B2EC2', // deep blue from turbo
        hover: '#3227A4'
      },
      info: {
        base: '#50E72B', // bright green from turbo
        hover: '#44C425'
      },
      warning: {
        base: '#F9E723', // yellow from turbo
        hover: '#D4C41E'
      },
      danger: {
        base: '#D73028', // bright red from turbo
        hover: '#B72822'
      }
    }
  };
  
  // Return the selected color scheme or fallback to default
  return colorSchemes[buttonColorScheme] || defaultColors;
}; 