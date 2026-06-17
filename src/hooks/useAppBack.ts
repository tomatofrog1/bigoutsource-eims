import { useNavigate } from 'react-router-dom';

export function useAppBack() {
  const navigate = useNavigate();

  return (fallbackUrl: string = '/') => {
    // Check if there is history within the app
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackUrl, { replace: true });
    }
  };
}
