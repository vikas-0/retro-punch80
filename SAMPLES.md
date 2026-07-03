# Complex Fortran sample decks

The tiny hello-world deck has completed its shift. These programs exercise nested loops, arrays, numerical methods, and a few more blinking lights.

Every sample below is designed for PUNCH/80:

- No interactive input is required.
- Every source line fits within 80 columns.
- Every program fits within the 50-card deck limit.
- Each program has been tested with the bundled LFortran WebAssembly runtime.

Copy one program into **PROGRAM INPUT**, build and punch the deck, select **PLAY DECK**, and then select **RUN FORTRAN**.

## 1. Mandelbrot census

This program scans a 60×24 region of the complex plane and reports how many points in each row remain bounded after 40 iterations. It exercises three nested loops, real arithmetic, escape-time iteration, and numerical classification.

```fortran
program mandelbrot_census
  implicit none
  integer, parameter :: width = 60, height = 24, max_iter = 40
  integer :: row, col, iter, row_inside, inside_total
  real :: cx, cy, zx, zy, next_zx

  inside_total = 0
  print *, 'ROW  POINTS INSIDE'

  do row = 1, height
    cy = 1.2 - 2.4 * real(row - 1) / real(height - 1)
    row_inside = 0
    do col = 1, width
      cx = -2.0 + 3.0 * real(col - 1) / real(width - 1)
      zx = 0.0
      zy = 0.0
      do iter = 1, max_iter
        next_zx = zx * zx - zy * zy + cx
        zy = 2.0 * zx * zy + cy
        zx = next_zx
        if (zx * zx + zy * zy > 4.0) exit
      end do
      if (zx * zx + zy * zy <= 4.0) row_inside = row_inside + 1
    end do
    inside_total = inside_total + row_inside
    print *, row, row_inside
  end do

  print *, 'TOTAL INSIDE:', inside_total
end program mandelbrot_census
```

Expected result: symmetric row counts peaking at `34` near the center, with `TOTAL INSIDE: 304`.

## 2. Sieve of Eratosthenes

This program marks composite numbers, collects the survivors, and prints every prime up to 100. It exercises logical and integer arrays, stepped loops, integer division, and indexed output.

```fortran
program prime_sieve
  implicit none
  integer, parameter :: limit = 100
  logical :: is_prime(limit)
  integer :: primes(limit)
  integer :: i, j, count

  is_prime = .true.
  is_prime(1) = .false.

  do i = 2, limit
    if (is_prime(i) .and. i <= limit / i) then
      do j = i * i, limit, i
        is_prime(j) = .false.
      end do
    end if
  end do

  count = 0
  do i = 2, limit
    if (is_prime(i)) then
      count = count + 1
      primes(count) = i
    end if
  end do

  print *, 'PRIME COUNT:', count
  do i = 1, count
    print *, primes(i)
  end do
end program prime_sieve
```

Expected result: a count of `25`, followed by the primes from `2` through `97`.

## 3. Three-by-three matrix multiplication

This version initializes `A`, constructs its transpose, and computes `A × transpose(A)` manually. All initialization and multiplication loops remain visible on the cards instead of being hidden behind array intrinsics.

```fortran
program matrix_product
  implicit none
  integer, parameter :: n = 3
  real :: a(n,n), b(n,n), c(n,n)
  integer :: i, j, k

  do i = 1, n
    do j = 1, n
      a(i,j) = real((i - 1) * n + j)
    end do
  end do

  do i = 1, n
    do j = 1, n
      b(i,j) = a(j,i)
    end do
  end do

  do i = 1, n
    do j = 1, n
      c(i,j) = 0.0
      do k = 1, n
        c(i,j) = c(i,j) + a(i,k) * b(k,j)
      end do
    end do
  end do

  print *, 'A TIMES TRANSPOSE(A)'
  do i = 1, n
    print *, c(i,1), c(i,2), c(i,3)
  end do
end program matrix_product
```

Expected result:

```text
A TIMES TRANSPOSE(A)
14.0  32.0  50.0
32.0  77.0 122.0
50.0 122.0 194.0
```

## Operator notes

- Run **PLAY DECK** again after manually editing holes; the compiler uses the latest playback capture.
- The first compilation loads the bundled LFortran WASM payload, so it takes longer than later runs.
- If you create another sample, keep lines at 80 characters or fewer and the complete program at 50 lines or fewer.

Now slide a deck into the hopper and make the future compute in monospace.
