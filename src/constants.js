export const SAMPLE_PROGRAM = `program hello
  implicit none
  integer :: i
  do i = 1, 5
    print *, 'HELLO FROM CARD', i
  end do
end program hello`;

export const SPEEDS = {
  slow: { label: "SLOW", punch: 72, read: 34 },
  medium: { label: "MEDIUM", punch: 34, read: 18 },
  turbo: { label: "TURBO", punch: 14, read: 8 },
  
};

export const sleep = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
